<?php

namespace App\Services;

use App\Models\Application;
use App\Repositories\ApplicationRepository;
use App\Repositories\DraftRepository;
use App\Repositories\JobRepository;
use App\Repositories\ProfileRepository;
use App\Repositories\UserRepository;
use App\Support\Pagination;

class ApplicationService
{
    public function __construct(
        private ApplicationRepository $applicationRepo,
        private DraftRepository       $draftRepo,
        private JobRepository         $jobRepo,
        private ProfileRepository     $profileRepo,
        private UserRepository        $userRepo,
        private EmailService          $emailService,
        private TelegramAuthService   $telegramAuth,
        private NotificationService   $notificationService,
        private LogService            $logService,
        private EmailGenerationService $emailGenerationService
    ) {}

    public function list(array $filter, ?int $page, ?int $pageSize): array
    {
        $pagination = Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->applicationRepo->list($filter, $pagination);

        return [
            'items'      => $items,
            'page'       => $pagination['page'],
            'pageSize'   => $pagination['pageSize'],
            'total'      => $total,
            'totalPages' => (int) ceil($total / $pagination['pageSize']),
        ];
    }

    public function get(string $userId, string $id): Application
    {
        $application = $this->applicationRepo->findById($userId, $id);
        if (!$application) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Application not found');
        }
        return $application;
    }

    /**
     * Dispatch an application to the job's contact channels.
     *
     * Supports two delivery channels, used together when both exist:
     *   - Email  (params['toEmail'], via SMTP)
     *   - Telegram DM (params['toTelegram'], sent from the user's own
     *     linked Telegram account through MadelineProto)
     */
    public function dispatch(array $params): array
    {
        $toEmail = $params['toEmail'] ?? null;
        $toTelegram = $this->normalizeTelegramHandle($params['toTelegram'] ?? null);

        $emailValid = $toEmail && filter_var($toEmail, FILTER_VALIDATE_EMAIL);

        if (!$emailValid && !$toTelegram) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'This job has no valid contact email or Telegram handle. Add one before sending.'
            );
        }

        if ($emailValid && !$this->emailService->isConfigured() && !$toTelegram) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'SMTP is not configured. Set MAIL_USERNAME and MAIL_PASSWORD in your .env file.'
            );
        }

        $existing = $this->applicationRepo->findByUserAndJob($params['userId'], $params['jobId']);
        if ($existing && $existing->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'This job has already been applied to');
        }

        $application = $existing ?? $this->applicationRepo->create([
            'userId'     => $params['userId'],
            'jobId'      => $params['jobId'],
            'draftId'    => $params['draftId'] ?? null,
            'toEmail'    => $emailValid ? $toEmail : '',
            'toTelegram' => $toTelegram,
            'subject'    => $params['subject'],
            'body'       => $params['body'],
            'status'     => 'SENDING',
        ]);

        $delivered = [];
        $failures = [];
        $messageId = null;

        // ── Channel 1: email ────────────────────────────────────────
        if ($emailValid && $this->emailService->isConfigured()) {
            try {
                $messageId = $this->emailService->send($toEmail, $params['subject'], $params['body']);
                $delivered[] = "email ({$toEmail})";
            } catch (\Throwable $e) {
                $failures[] = "email: {$e->getMessage()}";
            }
        }

        // ── Channel 2: Telegram DM ──────────────────────────────────
        if ($toTelegram) {
            try {
                $this->sendTelegramDm($params['userId'], $toTelegram, $params['subject'], $params['body']);
                $delivered[] = "Telegram (@{$toTelegram})";
                $messageId ??= 'telegram:@' . $toTelegram;
            } catch (\Throwable $e) {
                $failures[] = "Telegram @{$toTelegram}: {$e->getMessage()}";
            }
        }

        // ── Outcome ─────────────────────────────────────────────────
        if (!empty($delivered)) {
            $this->applicationRepo->markSent($application->id, $messageId ?? 'sent');

            // A partial failure still counts as sent — record what failed
            if (!empty($failures)) {
                Application::where('id', $application->id)
                    ->update(['error' => 'Partial: ' . implode(' | ', $failures)]);
            }

            $this->jobRepo->updateStatus($params['jobId'], 'APPLIED');

            if (!empty($params['draftId'])) {
                $this->draftRepo->updateStatus($params['draftId'], 'SENT');
            }

            $this->notificationService->create([
                'userId'   => $params['userId'],
                'type'     => 'APPLICATION_SENT',
                'title'    => 'Application sent',
                'message'  => 'Your application was sent via ' . implode(' and ', $delivered)
                    . (!empty($failures) ? ' — but ' . implode('; ', $failures) : ''),
                'metadata' => ['jobId' => $params['jobId'], 'applicationId' => $application->id],
            ]);

            return ['applicationId' => $application->id, 'status' => 'SENT'];
        }

        $error = implode(' | ', $failures) ?: 'No delivery channel available';
        $this->applicationRepo->markFailed($application->id, $error);

        $this->logService->error('EMAIL', 'Application dispatch failed', [
            'jobId' => $params['jobId'],
            'error' => $error,
        ]);

        $this->notificationService->create([
            'userId'   => $params['userId'],
            'type'     => 'APPLICATION_FAILED',
            'title'    => 'Application failed',
            'message'  => "Sending failed: {$error}",
            'metadata' => ['jobId' => $params['jobId'], 'applicationId' => $application->id],
        ]);

        return ['applicationId' => $application->id, 'status' => 'FAILED'];
    }

    /**
     * Send the application as a Telegram direct message, from the user's
     * own linked Telegram account.
     */
    private function sendTelegramDm(string $userId, string $handle, string $subject, string $body): void
    {
        $user = $this->userRepo->findById($userId);
        if (!$user || !$user->telegram_verified_at || !$user->telegram_session_path) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                422,
                'Your Telegram account is not linked — cannot send Telegram applications.'
            );
        }

        $text = trim($subject) !== '' ? "{$subject}\n\n{$body}" : $body;
        // Telegram messages cap at 4096 characters
        if (mb_strlen($text) > 4000) {
            $text = mb_substr($text, 0, 4000) . '…';
        }

        $api = $this->telegramAuth->makeUserApi($user);
        try {
            $api->messages->sendMessage(peer: '@' . $handle, message: $text);
            $this->logService->info('TELEGRAM', 'Application sent via Telegram DM', [
                'userId' => $userId,
                'to'     => '@' . $handle,
            ]);
        } finally {
            unset($api);
            gc_collect_cycles();
        }
    }

    /**
     * Strip @, t.me/ prefixes and validate the handle shape.
     */
    private function normalizeTelegramHandle(?string $handle): ?string
    {
        if (!$handle) {
            return null;
        }

        $handle = trim($handle);
        $handle = preg_replace('~^(?:https?://)?t(?:elegram)?\.me/~i', '', $handle);
        $handle = ltrim($handle, '@');

        return preg_match('/^[A-Za-z][A-Za-z0-9_]{3,31}$/', $handle) ? $handle : null;
    }

    /**
     * Approve a draft and send its email. Mirrors Node's approveDraft()
     */
    public function approveDraft(string $userId, string $draftId): array
    {
        $draft = $this->draftRepo->findById($userId, $draftId);
        if (!$draft) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Draft not found');
        }
        if ($draft->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'This draft has already been sent');
        }

        $this->draftRepo->updateStatus($draftId, 'APPROVED');

        return $this->dispatch([
            'userId'     => $userId,
            'jobId'      => $draft->job_id,
            'toEmail'    => $draft->to_email,
            'toTelegram' => $draft->to_telegram,
            'subject'    => $draft->subject,
            'body'       => $draft->body,
            'draftId'    => $draft->id,
        ]);
    }

    /**
     * Smart send: look up job contact email, generate email via AI, then dispatch.
     * Mirrors Node's applicationService.sendFromJob()
     */
    public function sendFromJob(string $userId, string $jobId): array
    {
        $job = $this->jobRepo->findById($userId, $jobId);
        if (!$job) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Job not found');
        }

        $hasEmail = !empty($job->contact_email) && filter_var($job->contact_email, FILTER_VALIDATE_EMAIL);
        $hasTelegram = !empty($job->contact_telegram);

        if (!$hasEmail && !$hasTelegram) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'This job has no valid contact email or Telegram handle. Add one before sending.'
            );
        }

        $profile = $this->profileRepo->findByUserId($userId);
        if (!$profile) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'Complete your profile before sending applications.'
            );
        }

        $email = $this->emailGenerationService->generate($job, $profile);

        return $this->dispatch([
            'userId'     => $userId,
            'jobId'      => $jobId,
            'toEmail'    => $hasEmail ? $job->contact_email : null,
            'toTelegram' => $job->contact_telegram,
            'subject'    => $email['subject'],
            'body'       => $email['body'],
        ]);
    }
}
