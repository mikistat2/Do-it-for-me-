<?php

namespace App\Services;

use App\Models\Job;
use App\Models\TelegramMessage;
use App\Models\JobMatch;
use App\Models\ApplicationDraft;
use App\Models\TelegramChannel;
use App\Repositories\JobRepository;
use App\Repositories\DraftRepository;
use App\Repositories\ProfileRepository;
use App\Repositories\SettingsRepository;
use Illuminate\Support\Facades\DB;
use App\Enums\JobStatus;
use Illuminate\Support\Str;

class ApplicationEngineService
{
    private const HIGH_SCORE_THRESHOLD = 85;

    public function __construct(
        private JobDetectorService $jobDetector,
        private MatchingService $matchingService,
        private JobRepository $jobRepo,
        private ProfileRepository $profileRepo,
        private SettingsRepository $settingsRepo,
        private DraftRepository $draftRepo,
        private ApplicationService $applicationService,
        private EmailGenerationService $emailGenerationService,
        private NotificationService $notificationService,
        private LogService $logService
    ) {}

    public function processMessage(array $message): array
    {
        $parsed = $this->jobDetector->detectJob($message['rawText']);

        // Upsert TelegramMessage
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

        $duplicate = $this->jobRepo->findByHash($message['userId'], $parsed['contentHash']);
        if ($duplicate) {
            $this->logService->info('SYSTEM', 'Duplicate job ignored', ['jobId' => $duplicate->id]);
            return ['status' => 'DUPLICATE', 'jobId' => $duplicate->id];
        }

        $job = DB::transaction(function () use ($parsed, $message, $telegramMessage) {
            $job = Job::create([
                'user_id' => $message['userId'],
                'message_id' => $telegramMessage->id,
                'title' => $parsed['title'],
                'company' => $parsed['company'],
                'contact_email' => $parsed['email'],
                'contact_phone' => $parsed['phone'],
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

        $profile = $this->profileRepo->findByUserId($message['userId']);
        $settings = $this->settingsRepo->findByUserId($message['userId']);

        if (!$profile) {
            $this->logService->warn('SYSTEM', 'No profile for matching', ['userId' => $message['userId']]);
            return ['status' => 'SKIPPED', 'jobId' => $job->id];
        }

        $analysis = $this->matchingService->analyze($job, $profile, $parsed['skills']);
        
        JobMatch::updateOrCreate(
            ['job_id' => $job->id],
            [
                'user_id' => $message['userId'],
                'score' => $analysis['score'],
                'strengths' => $analysis['strengths'],
                'weaknesses' => $analysis['weaknesses'],
                'reason' => $analysis['reason'],
                'recommendation' => $analysis['recommendation'],
            ]
        );

        $this->jobRepo->updateStatus($job->id, 'MATCHED');

        if ($analysis['score'] >= self::HIGH_SCORE_THRESHOLD && ($settings->notify_on_high_score ?? true)) {
            $this->notificationService->create([
                'userId' => $message['userId'],
                'type' => 'HIGH_SCORE_JOB',
                'title' => 'New high-score job',
                'message' => "{$job->title} scored {$analysis['score']}",
                'metadata' => ['jobId' => $job->id, 'score' => $analysis['score']],
            ]);
        }

        $decision = $this->decideApplicationAction([
            'score' => $analysis['score'],
            'contactEmail' => $parsed['email'],
            'profile' => $profile,
            'settings' => $settings,
        ]);

        if ($decision['action'] === 'SKIP') {
            $this->jobRepo->updateStatus($job->id, 'SKIPPED');
            $this->logService->info('SYSTEM', 'Job skipped', [
                'jobId' => $job->id,
                'reason' => $decision['reason'],
            ]);
            return ['status' => 'SKIPPED', 'jobId' => $job->id, 'score' => $analysis['score']];
        }

        $emailContent = $this->emailGenerationService->generate($job, $profile);
        
        $draft = ApplicationDraft::create([
            'job_id' => $job->id,
            'user_id' => $message['userId'],
            'subject' => $emailContent['subject'],
            'body' => $emailContent['body'],
            'to_email' => $parsed['email'] ?? '',
            'status' => 'PENDING',
        ]);
        
        $this->jobRepo->updateStatus($job->id, 'DRAFTED');

        if ($decision['action'] === 'AUTO_APPLY') {
            $result = $this->applicationService->dispatch([
                'userId' => $message['userId'],
                'jobId' => $job->id,
                'toEmail' => $parsed['email'],
                'subject' => $emailContent['subject'],
                'body' => $emailContent['body'],
                'draftId' => $draft->id,
            ]);
            return [
                'status' => $result['status'] === 'SENT' ? 'APPLIED' : 'SKIPPED',
                'jobId' => $job->id,
                'score' => $analysis['score'],
            ];
        }

        return ['status' => 'DRAFTED', 'jobId' => $job->id, 'score' => $analysis['score']];
    }

    private function decideApplicationAction(array $ctx): array
    {
        if (empty($ctx['contactEmail'])) {
            return ['action' => 'SKIP', 'reason' => 'No contact email found'];
        }

        $automationPaused = $ctx['settings']->automation_paused ?? true;
        if ($automationPaused) {
            return ['action' => 'DRAFT', 'reason' => 'Automation is paused'];
        }

        $score = $ctx['score'];
        $threshold = $ctx['settings']->match_threshold ?? 70;
        if ($score < $threshold) {
            return ['action' => 'SKIP', 'reason' => "Score {$score} is below threshold {$threshold}"];
        }

        $autoApply = $ctx['settings']->auto_apply ?? false;
        if ($autoApply) {
            return ['action' => 'AUTO_APPLY', 'reason' => 'Score meets threshold and auto-apply is ON'];
        }

        return ['action' => 'DRAFT', 'reason' => 'Score meets threshold but auto-apply is OFF'];
    }
}
