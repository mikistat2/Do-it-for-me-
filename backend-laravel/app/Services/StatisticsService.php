<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Computes dashboard statistics.
 * Mirrors Node's statisticsService (statistics.service.ts)
 */
class StatisticsService
{
    public function summary(string $userId): array
    {
        $jobs                = DB::table('jobs')->where('user_id', $userId)->count();
        $matchedJobs         = DB::table('jobs')->where('user_id', $userId)
                                  ->whereExists(fn($q) => $q->select(DB::raw(1))->from('job_matches')->whereColumn('job_matches.job_id', 'jobs.id'))
                                  ->count();
        $drafts              = DB::table('application_drafts')->where('user_id', $userId)->count();
        $pendingDrafts       = DB::table('application_drafts')->where('user_id', $userId)->where('status', 'PENDING')->count();
        $applications        = DB::table('applications')->where('user_id', $userId)->count();
        $applicationsSent    = DB::table('applications')->where('user_id', $userId)->where('status', 'SENT')->count();
        $applicationsFailed  = DB::table('applications')->where('user_id', $userId)->where('status', 'FAILED')->count();
        $channels            = DB::table('telegram_channels')->where('user_id', $userId)->count();
        $unreadNotifications = DB::table('notifications')->where('user_id', $userId)->where('is_read', false)->count();

        $avgScore = DB::table('job_matches')
            ->where('user_id', $userId)
            ->avg('score') ?? 0;

        $successRate = $applications > 0
            ? (int) round(($applicationsSent / $applications) * 100)
            : 0;

        return [
            'totals' => compact(
                'jobs', 'matchedJobs', 'drafts', 'pendingDrafts',
                'applications', 'applicationsSent', 'applicationsFailed',
                'channels', 'unreadNotifications'
            ),
            'successRate'       => $successRate,
            'averageMatchScore' => (int) round($avgScore),
        ];
    }

    public function jobsByStatus(string $userId): array
    {
        $statuses = ['DETECTED', 'MATCHED', 'DRAFTED', 'APPLIED', 'SKIPPED', 'ARCHIVED'];
        $result   = array_fill_keys($statuses, 0);

        $rows = DB::table('jobs')
            ->select('status', DB::raw('count(*) as cnt'))
            ->where('user_id', $userId)
            ->groupBy('status')
            ->get();

        foreach ($rows as $row) {
            $result[$row->status] = (int) $row->cnt;
        }

        return $result;
    }

    public function applicationsTrend(string $userId, int $days = 14): array
    {
        $since = now()->subDays($days - 1)->startOfDay();

        $applications = DB::table('applications')
            ->select('created_at', 'status')
            ->where('user_id', $userId)
            ->where('created_at', '>=', $since)
            ->get();

        $buckets = [];
        for ($i = 0; $i < $days; $i++) {
            $date           = $since->copy()->addDays($i)->toDateString();
            $buckets[$date] = ['date' => $date, 'sent' => 0, 'failed' => 0, 'total' => 0];
        }

        foreach ($applications as $app) {
            $date = \Carbon\Carbon::parse($app->created_at)->toDateString();
            if (!isset($buckets[$date])) continue;
            $buckets[$date]['total']++;
            if ($app->status === 'SENT')   $buckets[$date]['sent']++;
            if ($app->status === 'FAILED') $buckets[$date]['failed']++;
        }

        return array_values($buckets);
    }

    public function recentApplications(string $userId, int $limit = 5): array
    {
        return \App\Models\Application::with(['job.match'])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->take($limit)
            ->get()
            ->toArray();
    }

    public function pendingDrafts(string $userId, int $limit = 5): array
    {
        return \App\Models\ApplicationDraft::with(['job.match'])
            ->where('user_id', $userId)
            ->where('status', 'PENDING')
            ->orderBy('created_at', 'desc')
            ->take($limit)
            ->get()
            ->toArray();
    }
}
