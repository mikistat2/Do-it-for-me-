<?php

namespace App\Services;

use App\Repositories\NotificationRepository;
use App\Repositories\SettingsRepository;
use App\Support\Pagination;

class NotificationService
{
    public function __construct(
        private NotificationRepository $notificationRepo,
        private SettingsRepository     $settingsRepo
    ) {}

    /**
     * Conditionally create a notification based on user settings.
     * Mirrors Node's notificationService.create()
     */
    public function create(array $input): mixed
    {
        $settings = $this->settingsRepo->findByUserId($input['userId']);
        if ($settings) {
            if ($input['type'] === 'HIGH_SCORE_JOB'       && !$settings->notify_on_high_score) return null;
            if ($input['type'] === 'APPLICATION_SENT'      && !$settings->notify_on_sent)       return null;
            if ($input['type'] === 'APPLICATION_FAILED'    && !$settings->notify_on_failed)     return null;
        }

        return $this->notificationRepo->create([
            'user_id'  => $input['userId'],
            'type'     => $input['type'],
            'title'    => $input['title'],
            'message'  => $input['message'],
            'metadata' => $input['metadata'] ?? null,
        ]);
    }

    public function list(array $filter, ?int $page, ?int $pageSize): array
    {
        $pagination = Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->notificationRepo->list($filter, $pagination);

        return [
            'items'      => $items,
            'page'       => $pagination['page'],
            'pageSize'   => $pagination['pageSize'],
            'total'      => $total,
            'totalPages' => (int) ceil($total / $pagination['pageSize']),
        ];
    }

    public function countUnread(string $userId): int
    {
        return $this->notificationRepo->countUnread($userId);
    }

    public function markRead(string $userId, string $id): void
    {
        $count = $this->notificationRepo->markRead($userId, $id);
        if ($count === 0) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Notification not found');
        }
    }

    public function markAllRead(string $userId): int
    {
        return $this->notificationRepo->markAllRead($userId);
    }
}
