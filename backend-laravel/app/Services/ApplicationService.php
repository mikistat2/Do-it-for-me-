<?php

namespace App\Services;

use App\Models\Application;
use App\Repositories\ApplicationRepository;
use App\Repositories\DraftRepository;
use App\Repositories\JobRepository;
use App\Repositories\ProfileRepository;
use App\Support\Pagination;

class ApplicationService
{
    public function __construct(
        private ApplicationRepository $applicationRepo,
        private DraftRepository       $draftRepo,
        private JobRepository         $jobRepo,
        private ProfileRepository     $profileRepo,
        private EmailService          $emailService,
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
     * Dispatch an application email. Mirrors Node's applicationService.dispatch()
     */
    public function dispatch(array $params): array
    {
        if (!$this->emailService->isConfigured()) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'SMTP is not configured. Set MAIL_USERNAME and MAIL_PASSWORD in your .env file.'
            );
        }

        if (!filter_var($params['toEmail'], FILTER_VALIDATE_EMAIL)) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(400, 'A valid recipient email is required');
        }

        $existing = $this->applicationRepo->findByUserAndJob($params['userId'], $params['jobId']);
        if ($existing && $existing->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'This job has already been applied to');
        }

        $application = $existing ?? $this->applicationRepo->create([
            'userId'  => $params['userId'],
            'jobId'   => $params['jobId'],
            'draftId' => $params['draftId'] ?? null,
            'toEmail' => $params['toEmail'],
            'subject' => $params['subject'],
            'body'    => $params['body'],
            'status'  => 'SENDING',
        ]);

        try {
            $messageId = $this->emailService->send(
                $params['toEmail'],
                $params['subject'],
                $params['body'],
            );

            $this->applicationRepo->markSent($application->id, $messageId);
            $this->jobRepo->updateStatus($params['jobId'], 'APPLIED');

            if (!empty($params['draftId'])) {
                $this->draftRepo->updateStatus($params['draftId'], 'SENT');
            }

            $this->notificationService->create([
                'userId'   => $params['userId'],
                'type'     => 'APPLICATION_SENT',
                'title'    => 'Application sent',
                'message'  => "Your application was sent to {$params['toEmail']}",
                'metadata' => ['jobId' => $params['jobId'], 'applicationId' => $application->id],
            ]);

            return ['applicationId' => $application->id, 'status' => 'SENT'];
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $this->applicationRepo->markFailed($application->id, $message);

            $this->logService->error('EMAIL', 'Application dispatch failed', [
                'jobId' => $params['jobId'],
                'error' => $message,
            ]);

            $this->notificationService->create([
                'userId'   => $params['userId'],
                'type'     => 'APPLICATION_FAILED',
                'title'    => 'Application failed',
                'message'  => "Sending to {$params['toEmail']} failed: {$message}",
                'metadata' => ['jobId' => $params['jobId'], 'applicationId' => $application->id],
            ]);

            return ['applicationId' => $application->id, 'status' => 'FAILED'];
        }
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
            'userId'  => $userId,
            'jobId'   => $draft->job_id,
            'toEmail' => $draft->to_email,
            'subject' => $draft->subject,
            'body'    => $draft->body,
            'draftId' => $draft->id,
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
        if (empty($job->contact_email) || !filter_var($job->contact_email, FILTER_VALIDATE_EMAIL)) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'This job has no valid contact email. Add one before sending.'
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
            'userId'  => $userId,
            'jobId'   => $jobId,
            'toEmail' => $job->contact_email,
            'subject' => $email['subject'],
            'body'    => $email['body'],
        ]);
    }
}
