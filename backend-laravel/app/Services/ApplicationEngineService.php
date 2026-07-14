<?php

namespace App\Services;

use App\Models\Job;
use App\Models\TelegramMessage;
use App\Models\JobMatch;
use App\Models\ApplicationDraft;
use App\Repositories\JobRepository;
use App\Repositories\ProfileRepository;
use App\Repositories\SettingsRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApplicationEngineService
{
    private const HIGH_SCORE_THRESHOLD = 85;

    public function __construct(
        private JobDetectorService $jobDetector,
        private MatchingService $matchingService,
        private JobRepository $jobRepo,
        private ProfileRepository $profileRepo,
        private SettingsRepository $settingsRepo,
        private ApplicationService $applicationService,
        private EmailGenerationService $emailGenerationService,
        private NotificationService $notificationService,
        private TelegramBotService $telegramBot,
        private LogService $logService
    ) {}

    public function processMessage(array $message): array
    {
        $parsed = $this->jobDetector->detectJob($message['rawText']);
        $applyUrl = $this->jobDetector->extractApplyUrl(
            $message['rawText'],
            $message['replyMarkup'] ?? null,
        );

        // Upsert TelegramMessage — ALWAYS store, even non-jobs
        $telegramMessage = TelegramMessage::updateOrCreate(
            [
                'channel_id' => $message['channelId'],
                'telegram_msg_id' => (string) $message['telegramMsgId'],
            ],
            [
                'raw_text' => $message['rawText'],
                'sender_id' => $message['senderId'] ?? null,
                'is_job_post' => $parsed['isJobPost'],
                'message_date' => $message['messageDate'],
            ]
        );

        if (!$parsed['isJobPost']) {
            return ['status' => 'IGNORED'];
        }

        Log::info('Pipeline Step 1: Job post detected', [
            'title'    => $parsed['title'] ?? 'n/a',
            'email'    => $parsed['email'] ?? 'none',
            'telegram' => $parsed['telegram'] ?? 'none',
            'skills'   => count($parsed['skills']),
        ]);

        $duplicate = $this->jobRepo->findByHash($message['userId'], $parsed['contentHash']);
        if ($duplicate) {
            // Backfill the apply link if an earlier sync missed the button
            if ($applyUrl && empty($duplicate->apply_url)) {
                $duplicate->update(['apply_url' => $applyUrl]);
            }
            // If this job was stored before the user completed their profile,
            // it never got scored — score it now instead of dropping it.
            if (!$duplicate->match && $duplicate->status === 'DETECTED') {
                $rescued = $this->scoreAndDraft($duplicate, $parsed['skills']);
                if ($rescued !== null) {
                    return ['status' => $rescued['status'], 'jobId' => $duplicate->id, 'score' => $rescued['score']];
                }
            }
            return ['status' => 'DUPLICATE', 'jobId' => $duplicate->id];
        }

        $job = DB::transaction(function () use ($parsed, $message, $telegramMessage, $applyUrl) {
            $job = Job::create([
                'user_id' => $message['userId'],
                'message_id' => $telegramMessage->id,
                'title' => $parsed['title'],
                'company' => $parsed['company'],
                'contact_email' => $parsed['email'],
                'contact_phone' => $parsed['phone'],
                'contact_telegram' => $parsed['telegram'],
                'apply_url' => $applyUrl,
                'experience' => $parsed['experience'],
                'salary' => $parsed['salary'],
                'remote_type' => $parsed['remoteType'],
                'deadline' => $parsed['deadline'],
                'description' => $parsed['description'],
                'raw_text' => $message['rawText'],
                'content_hash' => $parsed['contentHash'],
                'status' => 'DETECTED',
            ]);

            foreach ($parsed['skills'] as $skill) {
                $job->skills()->create(['name' => $skill]);
            }
            foreach ($parsed['locations'] as $location) {
                $job->locations()->create(['name' => $location]);
            }

            return $job;
        });

        Log::info('Pipeline Step 2: Job created → DETECTED', [
            'jobId' => $job->id,
            'title' => $job->title,
            'email' => $job->contact_email ?? 'none',
        ]);

        $result = $this->scoreAndDraft($job, $parsed['skills']);

        if ($result === null) {
            // No profile yet — job is saved and will be scored once the
            // profile exists (via the duplicate-rescue path or scoreUnprocessedJobs).
            return ['status' => 'DETECTED', 'jobId' => $job->id];
        }

        return ['status' => $result['status'], 'jobId' => $job->id, 'score' => $result['score']];
    }

    /**
     * Score all of a user's DETECTED jobs that never got a match — e.g. jobs
     * picked up before the user completed their profile. Called from the
     * scheduled sync so ranking eventually happens for every job.
     */
    public function scoreUnprocessedJobs(string $userId): int
    {
        $profile = $this->profileRepo->findByUserId($userId);
        if (!$profile) {
            return 0;
        }

        $jobs = Job::with(['skills', 'match'])
            ->where('user_id', $userId)
            ->where('status', 'DETECTED')
            ->whereDoesntHave('match')
            ->orderBy('created_at')
            ->limit(25)
            ->get();

        $scored = 0;
        foreach ($jobs as $job) {
            $skills = $job->skills->pluck('name')->all();
            if ($this->scoreAndDraft($job, $skills) !== null) {
                $scored++;
            }
        }

        if ($scored > 0) {
            $this->logService->info('SYSTEM', 'Scored previously unprocessed jobs', [
                'userId' => $userId,
                'count'  => $scored,
            ]);
        }

        return $scored;
    }

    /**
     * Run the scoring → notification → draft → (auto-apply) pipeline for a job.
     *
     * Returns null when the user has no profile (job stays DETECTED).
     * Otherwise returns ['status' => ..., 'score' => ...].
     */
    private function scoreAndDraft(Job $job, array $jobSkills): ?array
    {
        $userId = $job->user_id;
        $profile = $this->profileRepo->findByUserId($userId);
        $settings = $this->settingsRepo->findByUserId($userId);

        if (!$profile) {
            Log::info('Pipeline: No profile → job kept as DETECTED', ['jobId' => $job->id]);
            $this->logService->warn('SYSTEM', 'No profile for matching — job saved but not scored', ['userId' => $userId]);
            return null;
        }

        $threshold = (int) ($settings->match_threshold ?? config('app.automation_match_threshold', 70));

        // ── Score the job (AI first, local fallback) ───────────────────
        $analysis = $this->matchingService->analyze($job, $profile, $jobSkills);

        Log::info('Pipeline Step 3: Scoring complete', [
            'jobId'          => $job->id,
            'score'          => $analysis['score'],
            'recommendation' => $analysis['recommendation'],
            'threshold'      => $threshold,
        ]);

        JobMatch::updateOrCreate(
            ['job_id' => $job->id],
            [
                'user_id' => $userId,
                'score' => $analysis['score'],
                'strengths' => $analysis['strengths'],
                'weaknesses' => $analysis['weaknesses'],
                'reason' => $analysis['reason'],
                'recommendation' => $analysis['recommendation'],
            ]
        );

        $this->jobRepo->updateStatus($job->id, 'MATCHED');

        // ── Below the user's threshold → keep as MATCHED, no draft ─────
        if ($analysis['score'] < $threshold) {
            Log::info('Pipeline complete: MATCHED (below threshold, no draft)', [
                'jobId' => $job->id,
                'score' => $analysis['score'],
            ]);
            return ['status' => 'MATCHED', 'score' => $analysis['score']];
        }

        // ── Score meets threshold → generate email draft ───────────────
        $emailContent = $this->emailGenerationService->generate($job, $profile);

        $draft = ApplicationDraft::updateOrCreate(
            ['job_id' => $job->id, 'user_id' => $userId],
            [
                'subject' => $emailContent['subject'],
                'body' => $emailContent['body'],
                'to_email' => $job->contact_email ?? '',
                'to_telegram' => $job->contact_telegram,
                'status' => 'PENDING',
            ]
        );

        $this->jobRepo->updateStatus($job->id, 'DRAFTED');

        Log::info('Pipeline Step 4: Draft created → DRAFTED', [
            'jobId'   => $job->id,
            'draftId' => $draft->id,
        ]);

        $hasEmail = !empty($job->contact_email) && filter_var($job->contact_email, FILTER_VALIDATE_EMAIL);
        $hasTelegram = !empty($job->contact_telegram);
        $hasApplyBot = !empty($job->apply_url);
        $automationPaused = (bool) ($settings->automation_paused ?? true);
        $autoApply = (bool) ($settings->auto_apply ?? false);

        // ── Pre-launch the channel's application bot (Afriwork-style) ──
        // Opens the bot chat with this job's payload in the user's own
        // Telegram, so they only have to tap Apply there.
        $botLaunched = false;
        if ($hasApplyBot && !$automationPaused) {
            $user = \App\Models\User::find($userId);
            if ($user) {
                $botLaunched = $this->telegramBot->launchApplyBot($user, $job->apply_url);
            }
        }

        // ── Notify the user that a matching job has a draft ready ──────
        $contactNote = match (true) {
            $hasEmail && $hasTelegram => 'An application draft is ready — it can be sent by email or Telegram (@' . $job->contact_telegram . ').',
            $hasEmail                 => 'An application draft is ready for review.',
            $hasTelegram              => 'An application draft is ready — it will be sent via Telegram (@' . $job->contact_telegram . ').',
            $hasApplyBot              => 'This job is applied to through its Telegram bot — a draft text is ready to use there.',
            default                   => 'Draft created, but no contact email or Telegram was found — add one before sending.',
        };

        if ($hasApplyBot) {
            $contactNote .= $botLaunched
                ? ' The application bot is already open in your Telegram — tap Apply there.'
                : ' Use the "Apply via Telegram bot" button in the job details.';
        }

        $this->notificationService->create([
            'userId' => $userId,
            'type' => 'HIGH_SCORE_JOB',
            'title' => $analysis['score'] >= self::HIGH_SCORE_THRESHOLD
                ? 'Excellent job match found'
                : 'New job match',
            'message' => "\"{$job->title}\" scored {$analysis['score']} (threshold {$threshold}). " . $contactNote,
            'metadata' => ['jobId' => $job->id, 'draftId' => $draft->id, 'score' => $analysis['score']],
        ]);

        // ── Auto-apply when enabled and any contact channel exists ─────

        if (!$automationPaused && $autoApply && ($hasEmail || $hasTelegram)) {
            Log::info('Pipeline Step 5: AUTO_APPLY → dispatching application', [
                'jobId'      => $job->id,
                'toEmail'    => $job->contact_email ?? 'none',
                'toTelegram' => $job->contact_telegram ?? 'none',
            ]);

            try {
                $result = $this->applicationService->dispatch([
                    'userId' => $userId,
                    'jobId' => $job->id,
                    'toEmail' => $hasEmail ? $job->contact_email : null,
                    'toTelegram' => $job->contact_telegram,
                    'subject' => $emailContent['subject'],
                    'body' => $emailContent['body'],
                    'draftId' => $draft->id,
                ]);

                if ($result['status'] === 'SENT') {
                    return ['status' => 'APPLIED', 'score' => $analysis['score']];
                }
            } catch (\Throwable $e) {
                Log::warning('Pipeline: auto-apply dispatch failed, keeping draft', [
                    'jobId' => $job->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Pipeline complete: DRAFTED (awaiting user review)', [
            'jobId'   => $job->id,
            'draftId' => $draft->id,
            'score'   => $analysis['score'],
        ]);

        return ['status' => 'DRAFTED', 'score' => $analysis['score']];
    }
}
