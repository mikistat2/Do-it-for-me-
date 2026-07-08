<?php

namespace App\Http\Controllers;

use App\Services\JobService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function __construct(private JobService $jobService) {}

    /** GET /jobs */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'status'     => 'sometimes|string|in:DETECTED,MATCHED,DRAFTED,APPLIED,SKIPPED,ARCHIVED',
            'remoteType' => 'sometimes|string|in:REMOTE,ONSITE,HYBRID,UNKNOWN',
            'company'    => 'sometimes|string|max:80',
            'minScore'   => 'sometimes|integer|min:0|max:100',
            'search'     => 'sometimes|string|max:200',
            'sortBy'     => 'sometimes|string|in:createdAt,title,company,status',
            'sortOrder'  => 'sometimes|string|in:asc,desc',
            'page'       => 'sometimes|integer|min:1',
            'pageSize'   => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->jobService->list(
            [
                'userId'     => $request->user()->id,
                'status'     => $query['status']     ?? null,
                'remoteType' => $query['remoteType'] ?? null,
                'company'    => $query['company']    ?? null,
                'minScore'   => isset($query['minScore']) ? (int) $query['minScore'] : null,
                'search'     => $query['search']     ?? null,
            ],
            [
                'sortBy'    => $query['sortBy']    ?? 'created_at',
                'sortOrder' => $query['sortOrder'] ?? 'desc',
            ],
            $query['page']     ?? null,
            $query['pageSize'] ?? null,
        );

        return ApiResponse::success(
            $result['items'],
            200,
            ApiResponse::paginateMeta($result['page'], $result['pageSize'], $result['total'])
        );
    }

    /** GET /jobs/{id} */
    public function get(Request $request, string $id): JsonResponse
    {
        $job = $this->jobService->get($request->user()->id, $id);
        return ApiResponse::success($job);
    }

    /** POST /jobs/{id}/archive */
    public function archive(Request $request, string $id): JsonResponse
    {
        $this->jobService->archive($request->user()->id, $id);
        return ApiResponse::success(['message' => 'Job archived']);
    }
}
