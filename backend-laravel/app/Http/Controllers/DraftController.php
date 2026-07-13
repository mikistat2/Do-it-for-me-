<?php

namespace App\Http\Controllers;

use App\Services\DraftService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DraftController extends Controller
{
    public function __construct(private DraftService $draftService) {}

    /** GET /drafts */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'status'   => 'sometimes|string|in:PENDING,APPROVED,REJECTED,SENT',
            'search'   => 'sometimes|string|max:200',
            'page'     => 'sometimes|integer|min:1',
            'pageSize' => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->draftService->list(
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

    /** GET /drafts/{id} */
    public function get(Request $request, string $id): JsonResponse
    {
        $draft = $this->draftService->get($request->user()->id, $id);
        return ApiResponse::success($draft);
    }

    /** PUT /drafts/{id} */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'subject'    => 'sometimes|string|min:1|max:255',
            'body'       => 'sometimes|string|min:1|max:20000',
            'toEmail'    => 'sometimes|nullable|email',
            'toTelegram' => ['sometimes', 'nullable', 'string', 'regex:/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/'],
        ]);

        $mapped = array_filter([
            'subject'     => $data['subject']  ?? null,
            'body'        => $data['body']     ?? null,
            'to_email'    => $data['toEmail']  ?? null,
            'to_telegram' => isset($data['toTelegram']) ? ltrim($data['toTelegram'], '@') : null,
        ], fn($v) => $v !== null);

        $draft = $this->draftService->update($request->user()->id, $id, $mapped);
        return ApiResponse::success($draft);
    }

    /** POST /drafts/{id}/reject */
    public function reject(Request $request, string $id): JsonResponse
    {
        $draft = $this->draftService->reject($request->user()->id, $id);
        return ApiResponse::success($draft);
    }

    /** POST /drafts/{id}/regenerate */
    public function regenerate(Request $request, string $id): JsonResponse
    {
        $draft = $this->draftService->regenerate($request->user()->id, $id);
        return ApiResponse::success($draft);
    }
}
