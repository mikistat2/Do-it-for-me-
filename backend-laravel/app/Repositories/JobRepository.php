<?php

namespace App\Repositories;

use App\Models\Job;

class JobRepository
{
    private const SORTABLE_FIELDS = ['created_at', 'title', 'company', 'status'];

    /**
     * List jobs with filters, sorting, and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $sort, array $pagination): array
    {
        $query = Job::with(['skills', 'locations', 'match', 'message.channel'])
            ->where('user_id', $filter['userId']);

        if (!empty($filter['status'])) {
            $query->where('status', $filter['status']);
        }
        if (!empty($filter['remoteType'])) {
            $query->where('remote_type', $filter['remoteType']);
        }
        if (!empty($filter['company'])) {
            $query->where('company', 'ilike', '%' . $filter['company'] . '%');
        }
        if (isset($filter['minScore'])) {
            $query->whereHas('match', fn($q) => $q->where('score', '>=', $filter['minScore']));
        }
        if (!empty($filter['search'])) {
            $search = $filter['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('company', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $sortField = in_array($sort['sortBy'], self::SORTABLE_FIELDS)
            ? $sort['sortBy']
            : 'created_at';

        $total = $query->count();
        $items = $query->orderBy($sortField, $sort['sortOrder'] ?? 'desc')
                       ->skip($pagination['skip'])
                       ->take($pagination['take'])
                       ->get();

        return compact('items', 'total');
    }

    public function findById(string $userId, string $id): ?Job
    {
        return Job::with(['skills', 'locations', 'match', 'message.channel'])
            ->where('id', $id)
            ->where('user_id', $userId)
            ->first();
    }

    public function findByHash(string $userId, string $contentHash): ?Job
    {
        return Job::with(['skills', 'locations', 'match', 'message'])
            ->where('user_id', $userId)
            ->where('content_hash', $contentHash)
            ->first();
    }

    public function updateStatus(string $id, string $status): Job
    {
        $job = Job::findOrFail($id);
        $job->update(['status' => $status]);
        return $job->fresh();
    }
}
