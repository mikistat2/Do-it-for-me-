<?php

namespace App\Http\Controllers;

use App\Services\ApplicationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(private ApplicationService $applicationService) {}

    /** GET /applications */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'status'   => 'sometimes|string|in:QUEUED,SENDING,SENT,FAILED,SKIPPED',
            'search'   => 'sometimes|string|max:200',
            'page'     => 'sometimes|integer|min:1',
            'pageSize' => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->applicationService->list(
            [
                'userId' => $request->user()->id,
                'status' => $query['status'] ?? null,
                'search' => $query['search'] ?? null,
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

    /** GET /applications/{id} */
    public function get(Request $request, string $id): JsonResponse
    {
        $application = $this->applicationService->get($request->user()->id, $id);
        return ApiResponse::success($application);
    }

    /** POST /applications/send */
    public function manualSend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jobId'   => 'required|uuid',
            'toEmail' => 'sometimes|email',
            'subject' => 'sometimes|string|min:1|max:255',
            'body'    => 'sometimes|string|min:1|max:20000',
        ]);

        $userId  = $request->user()->id;
        $hasPayload = !empty($data['toEmail']) && !empty($data['subject']) && !empty($data['body']);

        $result = $hasPayload
            ? $this->applicationService->dispatch([
                'userId'  => $userId,
                'jobId'   => $data['jobId'],
                'toEmail' => $data['toEmail'],
                'subject' => $data['subject'],
                'body'    => $data['body'],
            ])
            : $this->applicationService->sendFromJob($userId, $data['jobId']);

        return ApiResponse::created($result);
    }

    /** POST /applications/drafts/{id}/approve */
    public function approveDraft(Request $request, string $id): JsonResponse
    {
        $result = $this->applicationService->approveDraft($request->user()->id, $id);
        return ApiResponse::created($result);
    }
}
