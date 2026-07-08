<?php

namespace App\Services;

use App\Models\ApplicationDraft;
use App\Repositories\DraftRepository;
use App\Repositories\JobRepository;
use App\Repositories\ProfileRepository;
use App\Support\Pagination;

class DraftService
{
    public function __construct(
        private DraftRepository $draftRepo,
        private JobRepository $jobRepo,
        private ProfileRepository $profileRepo,
        private EmailGenerationService $emailGenerationService,
    ) {}

    public function list(array $filter, ?int $page, ?int $pageSize): array
    {
        $pagination = Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->draftRepo->list($filter, $pagination);

        return [
            'items'      => $items,
            'page'       => $pagination['page'],
            'pageSize'   => $pagination['pageSize'],
            'total'      => $total,
            'totalPages' => (int) ceil($total / $pagination['pageSize']),
        ];
    }

    public function get(string $userId, string $id): ApplicationDraft
    {
        $draft = $this->draftRepo->findById($userId, $id);
        if (!$draft) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Draft not found');
        }
        return $draft;
    }

    public function update(string $userId, string $id, array $input): ApplicationDraft
    {
        $draft = $this->get($userId, $id);
        if ($draft->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(400, 'A sent draft can no longer be edited');
        }
        return $this->draftRepo->update($id, $input);
    }

    public function reject(string $userId, string $id): ApplicationDraft
    {
        $draft = $this->get($userId, $id);
        if ($draft->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(400, 'A sent draft cannot be rejected');
        }
        return $this->draftRepo->updateStatus($id, 'REJECTED');
    }

    /**
     * Regenerate a draft's email content using AI.
     * Fetches the associated job and the user's profile, then calls
     * EmailGenerationService to produce fresh content.
     */
    public function regenerate(string $userId, string $id): ApplicationDraft
    {
        $draft = $this->get($userId, $id);

        if ($draft->status === 'SENT') {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(400, 'A sent draft cannot be regenerated');
        }

        $job = $this->jobRepo->findById($userId, $draft->job_id);
        if (!$job) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Associated job not found');
        }

        $profile = $this->profileRepo->findByUserId($userId);
        if (!$profile) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                400,
                'Complete your profile before regenerating drafts'
            );
        }

        $emailContent = $this->emailGenerationService->generate($job, $profile);

        return $this->draftRepo->update($id, [
            'subject' => $emailContent['subject'],
            'body'    => $emailContent['body'],
            'status'  => 'PENDING',
        ]);
    }
}

