<?php

namespace App\Http\Controllers;

use App\Services\SettingsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    public function __construct(private SettingsService $settingsService) {}

    /** GET /automation/status */
    public function status(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $settings = $this->settingsService->get($userId);
        $user     = $request->user();

        return ApiResponse::success([
            'automationPaused'   => $settings->automation_paused,
            'autoApply'          => $settings->auto_apply,
            'matchThreshold'     => $settings->match_threshold,
            'telegramConfigured' => (bool) $user->telegram_verified_at,
            'hfConfigured'       => !empty(config('app.hf_token')),
        ]);
    }

    /** POST /automation/pause */
    public function pause(Request $request): JsonResponse
    {
        $this->settingsService->update($request->user()->id, ['automation_paused' => true]);
        return ApiResponse::success(['message' => 'Automation paused']);
    }

    /** POST /automation/resume */
    public function resume(Request $request): JsonResponse
    {
        $this->settingsService->update($request->user()->id, ['automation_paused' => false]);
        return ApiResponse::success(['message' => 'Automation resumed']);
    }
}
