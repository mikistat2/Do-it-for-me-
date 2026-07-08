<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = null, int $status = 200, array $meta = []): JsonResponse
    {
        $payload = ['success' => true, 'data' => $data];
        if (!empty($meta)) {
            $payload['meta'] = $meta;
        }
        return response()->json($payload, $status);
    }

    public static function created(mixed $data = null): JsonResponse
    {
        return self::success($data, 201);
    }

    public static function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    public static function error(string $message, int $status = 400, array $details = []): JsonResponse
    {
        $payload = ['success' => false, 'error' => $message];
        if (!empty($details)) {
            $payload['details'] = $details;
        }
        return response()->json($payload, $status);
    }

    /**
     * Build paginated meta from pagination params and total.
     */
    public static function paginateMeta(int $page, int $pageSize, int $total): array
    {
        return [
            'page'       => $page,
            'pageSize'   => $pageSize,
            'total'      => $total,
            'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 0,
        ];
    }
}
