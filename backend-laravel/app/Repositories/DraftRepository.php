<?php

namespace App\Repositories;

use App\Models\ApplicationDraft;

class DraftRepository
{
    /**
     * List drafts with filters and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $pagination): array
    {
        $query = ApplicationDraft::with(['job.match'])
            ->where('user_id', $filter['userId']);

        if (!empty($filter['status'])) {
            $query->where('status', $filter['status']);
        }
        if (!empty($filter['search'])) {
            $search = $filter['search'];
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                  ->orWhere('to_email', 'ilike', "%{$search}%")
                  ->orWhereHas('job', fn($j) => $j->where('title', 'ilike', "%{$search}%"));
            });
        }

        $total = $query->count();
        $items = $query->orderBy('created_at', 'desc')
                       ->skip($pagination['skip'])
                       ->take($pagination['take'])
                       ->get();

        return compact('items', 'total');
    }

    public function create(array $data): ApplicationDraft
    {
        return ApplicationDraft::create($data);
    }

    public function findById(string $userId, string $id): ?ApplicationDraft
    {
        return ApplicationDraft::with(['job.match'])
            ->where('id', $id)
            ->where('user_id', $userId)
            ->first();
    }

    public function updateStatus(string $id, string $status): ApplicationDraft
    {
        $draft = ApplicationDraft::findOrFail($id);
        $draft->update(['status' => $status]);
        return $draft->fresh();
    }

    public function update(string $id, array $data): ApplicationDraft
    {
        $draft = ApplicationDraft::findOrFail($id);
        $draft->update($data);
        return $draft->fresh();
    }
}
