<?php

namespace App\Repositories;

use App\Models\Application;

class ApplicationRepository
{
    /**
     * List applications with filters and pagination.
     * Returns ['items' => Collection, 'total' => int]
     */
    public function list(array $filter, array $pagination): array
    {
        $query = Application::with(['job.match'])
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

    public function findByUserAndJob(string $userId, string $jobId): ?Application
    {
        return Application::where('user_id', $userId)
            ->where('job_id', $jobId)
            ->first();
    }

    public function create(array $data): Application
    {
        return Application::create([
            'job_id'      => $data['jobId'],
            'user_id'     => $data['userId'],
            'draft_id'    => $data['draftId'] ?? null,
            'to_email'    => $data['toEmail'] ?? '',
            'to_telegram' => $data['toTelegram'] ?? null,
            'subject'     => $data['subject'],
            'body'        => $data['body'],
            'status'      => $data['status'],
        ]);
    }

    public function findById(string $userId, string $id): ?Application
    {
        return Application::with(['job.match'])
            ->where('id', $id)
            ->where('user_id', $userId)
            ->first();
    }

    public function markSent(string $id, string $messageId): Application
    {
        $app = Application::findOrFail($id);
        $app->update([
            'status'     => 'SENT',
            'message_id' => $messageId,
            'sent_at'    => now(),
            'attempts'   => $app->attempts + 1,
            'error'      => null,
        ]);
        return $app->fresh();
    }

    public function markFailed(string $id, string $error): Application
    {
        $app = Application::findOrFail($id);
        $app->update([
            'status'   => 'FAILED',
            'attempts' => $app->attempts + 1,
            'error'    => $error,
        ]);
        return $app->fresh();
    }
}
