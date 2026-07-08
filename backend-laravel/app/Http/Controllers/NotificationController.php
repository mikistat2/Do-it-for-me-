<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notificationService) {}

    /** GET /notifications */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'isRead'   => 'sometimes|in:true,false',
            'type'     => 'sometimes|string|in:APPLICATION_SENT,APPLICATION_FAILED,HIGH_SCORE_JOB,SYSTEM_STOPPED,SYSTEM_STARTED',
            'search'   => 'sometimes|string|max:200',
            'page'     => 'sometimes|integer|min:1',
            'pageSize' => 'sometimes|integer|min:1|max:100',
        ]);

        $isRead = isset($query['isRead']) ? ($query['isRead'] === 'true') : null;

        $result = $this->notificationService->list(
            [
                'userId' => $request->user()->id,
                'isRead' => $isRead,
                'type'   => $query['type']   ?? null,
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

    /** GET /notifications/unread-count */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->notificationService->countUnread($request->user()->id);
        return ApiResponse::success(['count' => $count]);
    }

    /** PUT /notifications/{id}/read */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $this->notificationService->markRead($request->user()->id, $id);
        return ApiResponse::success(['message' => 'Notification marked as read']);
    }

    /** PUT /notifications/read-all */
    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->notificationService->markAllRead($request->user()->id);
        return ApiResponse::success(['count' => $count]);
    }
}
