<?php

namespace App\Http\Controllers;

use App\Services\ChannelService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    public function __construct(private ChannelService $channelService) {}

    /** GET /channels */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'status'   => 'sometimes|string|in:ACTIVE,PAUSED,ERROR',
            'search'   => 'sometimes|string|max:200',
            'page'     => 'sometimes|integer|min:1',
            'pageSize' => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->channelService->list(
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

    /** POST /channels */
    public function create(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channelId' => 'required|string|min:1|max:120',
            'title'     => 'required|string|min:1|max:200',
            'username'  => 'sometimes|nullable|string|max:120',
        ]);

        $channel = $this->channelService->create($request->user()->id, $data);
        return ApiResponse::created($channel);
    }

    /** PUT /channels/{id} */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'title'  => 'sometimes|string|min:1|max:200',
            'status' => 'sometimes|string|in:ACTIVE,PAUSED,ERROR',
        ]);

        $channel = $this->channelService->update($request->user()->id, $id, $data);
        return ApiResponse::success($channel);
    }

    /** DELETE /channels/{id} */
    public function remove(Request $request, string $id): JsonResponse
    {
        $this->channelService->remove($request->user()->id, $id);
        return ApiResponse::noContent();
    }

    /** POST /channels/{id}/sync */
    public function sync(Request $request, string $id): JsonResponse
    {
        $result = $this->channelService->syncHistory($request->user()->id, $id);
        return ApiResponse::success($result);
    }
}
