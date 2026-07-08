<?php

namespace App\Repositories;

use App\Models\Notification;

class NotificationRepository
{
    /**
     * List notifications with filters and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $pagination): array
    {
        $query = Notification::where('user_id', $filter['userId']);

        if (isset($filter['isRead'])) {
            $query->where('is_read', $filter['isRead']);
        }
        if (!empty($filter['type'])) {
            $query->where('type', $filter['type']);
        }
        if (!empty($filter['search'])) {
            $search = $filter['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('message', 'ilike', "%{$search}%");
            });
        }

        $total = $query->count();
        $items = $query->orderBy('created_at', 'desc')
                       ->skip($pagination['skip'])
                       ->take($pagination['take'])
                       ->get();

        return compact('items', 'total');
    }

    public function create(array $data): Notification
    {
        return Notification::create($data);
    }

    public function countUnread(string $userId): int
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    public function markRead(string $userId, string $id): int
    {
        return Notification::where('id', $id)
            ->where('user_id', $userId)
            ->update(['is_read' => true]);
    }

    public function markAllRead(string $userId): int
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }
}
