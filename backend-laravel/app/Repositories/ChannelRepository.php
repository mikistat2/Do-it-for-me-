<?php

namespace App\Repositories;

use App\Models\TelegramChannel;
use Illuminate\Support\Collection;

class ChannelRepository
{
    /**
     * List channels for a user with optional filters and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $pagination): array
    {
        $query = TelegramChannel::where('user_id', $filter['userId']);

        if (!empty($filter['status'])) {
            $query->where('status', $filter['status']);
        }

        if (!empty($filter['search'])) {
            $search = $filter['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('username', 'ilike', "%{$search}%");
            });
        }

        $total = $query->count();
        $items = $query->orderBy('created_at', 'desc')
                       ->skip($pagination['skip'])
                       ->take($pagination['take'])
                       ->get();

        return compact('items', 'total');
    }

    public function create(array $data): TelegramChannel
    {
        return TelegramChannel::create([
            'user_id'    => $data['userId'],
            'channel_id' => $data['channelId'],
            'title'      => $data['title'],
            'username'   => $data['username'] ?? null,
        ]);
    }

    public function findById(string $userId, string $id): ?TelegramChannel
    {
        return TelegramChannel::where('id', $id)->where('user_id', $userId)->first();
    }

    public function findActiveForUser(string $userId): Collection
    {
        return TelegramChannel::where('user_id', $userId)
            ->where('status', 'ACTIVE')
            ->get();
    }

    public function update(string $id, array $data): TelegramChannel
    {
        $channel = TelegramChannel::findOrFail($id);
        $channel->update($data);
        return $channel->fresh();
    }

    public function delete(string $id): void
    {
        TelegramChannel::destroy($id);
    }
}
