<?php

namespace App\Http\Controllers;

use App\Services\StatisticsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private StatisticsService $statisticsService) {}

    /** GET /dashboard */
    public function overview(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $summary              = $this->statisticsService->summary($userId);
        $jobsByStatus         = $this->statisticsService->jobsByStatus($userId);
        $recentApplications   = $this->statisticsService->recentApplications($userId);
        $pendingDrafts        = $this->statisticsService->pendingDrafts($userId);

        return ApiResponse::success(compact(
            'summary',
            'jobsByStatus',
            'recentApplications',
            'pendingDrafts',
        ));
    }

    /** GET /dashboard/statistics */
    public function statistics(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $summary             = $this->statisticsService->summary($userId);
        $jobsByStatus        = $this->statisticsService->jobsByStatus($userId);
        $applicationsTrend   = $this->statisticsService->applicationsTrend($userId);

        return ApiResponse::success(compact(
            'summary',
            'jobsByStatus',
            'applicationsTrend',
        ));
    }
}
