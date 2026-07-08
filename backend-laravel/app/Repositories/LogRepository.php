<?php

namespace App\Repositories;

use App\Models\Log;

class LogRepository
{
    public function create(array $data): Log
    {
        return Log::create([
            'level'    => $data['level'],
            'category' => $data['category'],
            'message'  => $data['message'],
            'context'  => $data['context'] ?? null,
        ]);
    }

    /**
     * List logs with filters and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $pagination): array
    {
        $query = Log::query();

        if (!empty($filter['level'])) {
            $query->where('level', $filter['level']);
        }
        if (!empty($filter['category'])) {
            $query->where('category', $filter['category']);
        }
        if (!empty($filter['search'])) {
            $query->where('message', 'ilike', '%' . $filter['search'] . '%');
        }

        $total = $query->count();
        $items = $query->orderBy('created_at', 'desc')
                       ->skip($pagination['skip'])
                       ->take($pagination['take'])
                       ->get();

        return compact('items', 'total');
    }
}
