<?php

namespace App\Http\Controllers;

use App\Services\SettingsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private SettingsService $settingsService) {}

    /** GET /settings */
    public function get(Request $request): JsonResponse
    {
        $settings = $this->settingsService->get($request->user()->id);
        return ApiResponse::success($settings);
    }

    /** PUT /settings */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'automationPaused'  => 'sometimes|boolean',
            'autoApply'         => 'sometimes|boolean',
            'matchThreshold'    => 'sometimes|integer|min:0|max:100',
            'notifyOnHighScore' => 'sometimes|boolean',
            'notifyOnSent'      => 'sometimes|boolean',
            'notifyOnFailed'    => 'sometimes|boolean',
        ]);

        $mapped = array_filter([
            'automation_paused'    => $data['automationPaused']  ?? null,
            'auto_apply'           => $data['autoApply']         ?? null,
            'match_threshold'      => $data['matchThreshold']    ?? null,
            'notify_on_high_score' => $data['notifyOnHighScore'] ?? null,
            'notify_on_sent'       => $data['notifyOnSent']      ?? null,
            'notify_on_failed'     => $data['notifyOnFailed']    ?? null,
        ], fn($v) => $v !== null);

        $settings = $this->settingsService->update($request->user()->id, $mapped);
        return ApiResponse::success($settings);
    }

    /** POST /settings/pause */
    public function pause(Request $request): JsonResponse
    {
        $settings = $this->settingsService->setPaused($request->user()->id, true);
        return ApiResponse::success($settings);
    }

    /** POST /settings/resume */
    public function resume(Request $request): JsonResponse
    {
        $settings = $this->settingsService->setPaused($request->user()->id, false);
        return ApiResponse::success($settings);
    }
}
