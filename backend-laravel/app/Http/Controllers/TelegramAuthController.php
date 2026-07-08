<?php

namespace App\Http\Controllers;

use App\Services\TelegramAuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;  

class TelegramAuthController extends Controller
{
    public function __construct(private TelegramAuthService $telegramAuth) {}

    /** POST /auth/telegram/send-code */
    public function sendCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'             => 'required|string|min:8|max:20',
            'registrationToken' => 'sometimes|nullable|uuid',
        ]);

        $result = $this->telegramAuth->sendCode(
            $data['phone'],
            $data['registrationToken'] ?? null,
        );
        return ApiResponse::success($result);
    }

    /** POST /auth/telegram/verify */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registrationToken' => 'required|uuid',
            'code'              => 'required|string|min:4|max:10',
            'password'          => 'sometimes|nullable|string|min:1|max:256',
        ]);

        $result = $this->telegramAuth->verify(
            $data['registrationToken'],
            $data['code'],
            $data['password'] ?? null,
        );

        return ApiResponse::success($result);
    }

    /** POST /auth/telegram/verify-2fa */
    public function verify2fa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registrationToken' => 'required|uuid',
            'password'          => 'required|string|min:1|max:256',
        ]);

        $result = $this->telegramAuth->verify2fa(
            $data['registrationToken'],
            $data['password'],
        );

        return ApiResponse::success($result);
    }
}
