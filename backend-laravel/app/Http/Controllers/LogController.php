<?php

namespace App\Http\Controllers;

use App\Services\LogService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function __construct(private LogService $logService) {}

    /** GET /logs */
    public function list(Request $request): JsonResponse
    {
        $query = $request->validate([
            'level'    => 'sometimes|string|in:TRACE,DEBUG,INFO,WARN,ERROR,FATAL',
            'category' => 'sometimes|string|in:TELEGRAM,AI,EMAIL,AUTH,SYSTEM,ERROR',
            'search'   => 'sometimes|string|max:200',
            'page'     => 'sometimes|integer|min:1',
            'pageSize' => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->logService->list(
            [
                'level'    => $query['level']    ?? null,
                'category' => $query['category'] ?? null,
                'search'   => $query['search']   ?? null,
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
}
