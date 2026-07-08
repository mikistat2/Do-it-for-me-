<?php

namespace App\Services;

use App\Models\Job;
use App\Repositories\JobRepository;
use App\Support\Pagination;

class JobService
{
    public function __construct(
        private JobRepository $jobRepo
    ) {}

    public function list(array $filter, array $sort, ?int $page, ?int $pageSize): array
    {
        $pagination = Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->jobRepo->list($filter, $sort, $pagination);

        return [
            'items'      => $items,
            'page'       => $pagination['page'],
            'pageSize'   => $pagination['pageSize'],
            'total'      => $total,
            'totalPages' => (int) ceil($total / $pagination['pageSize']),
        ];
    }

    public function get(string $userId, string $id): Job
    {
        $job = $this->jobRepo->findById($userId, $id);
        if (!$job) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Job not found');
        }
        return $job;
    }

    public function archive(string $userId, string $id): void
    {
        $this->get($userId, $id);
        $this->jobRepo->updateStatus($id, 'ARCHIVED');
    }
}
