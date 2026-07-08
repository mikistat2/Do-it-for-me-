<?php

namespace App\Services;

use App\Repositories\LogRepository;
use Illuminate\Support\Facades\Log as LaravelLog;

class LogService
{
    public function __construct(
        private LogRepository $logRepo
    ) {}

    /**
     * Persist a log entry to the database and emit via Laravel's logger.
     * Mirrors Node's logService.record() – DB failures are swallowed so they
     * never interrupt the calling flow.
     */
    public function record(string $level, string $category, string $message, array $context = []): void
    {
        // Emit via Laravel logger
        $laravelLevel = strtolower($level);
        if (method_exists(LaravelLog::class, $laravelLevel)) {
            LaravelLog::{$laravelLevel}($message, array_merge(['category' => $category], $context));
        } else {
            LaravelLog::info($message, array_merge(['category' => $category], $context));
        }

        // Persist to DB (swallow errors)
        try {
            $this->logRepo->create([
                'level'    => strtoupper($level),
                'category' => $category,
                'message'  => $message,
                'context'  => !empty($context) ? $context : null,
            ]);
        } catch (\Throwable) {
            // intentionally silent
        }
    }

    public function info(string $category, string $message, array $context = []): void
    {
        $this->record('INFO', $category, $message, $context);
    }

    public function warn(string $category, string $message, array $context = []): void
    {
        $this->record('WARN', $category, $message, $context);
    }

    public function error(string $category, string $message, array $context = []): void
    {
        $this->record('ERROR', $category, $message, $context);
    }

    public function list(array $filter, ?int $page, ?int $pageSize): array
    {
        $pagination = \App\Support\Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->logRepo->list($filter, $pagination);

        $mappedItems = $items->map(function ($log) {
            return [
                'id'        => $log->id,
                'level'     => $log->level,
                'category'  => $log->category,
                'message'   => $log->message,
                'context'   => $log->context,
                'createdAt' => $log->created_at,
            ];
        });

        return [
            'items'      => $mappedItems,
            'page'       => $pagination['page'],
            'pageSize'   => $pagination['pageSize'],
            'total'      => $total,
            'totalPages' => (int) ceil($total / $pagination['pageSize']),
        ];
    }
}
