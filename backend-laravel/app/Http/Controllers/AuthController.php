<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    /** POST /auth/register */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'             => 'required|email|max:255',
            'password'          => 'required|string|min:8|max:128',
            'fullName'          => 'required|string|min:1|max:120',
            'registrationToken' => 'required|uuid',
            'code'              => 'required|string|min:4|max:10',
            'telegramPassword'  => 'sometimes|nullable|string|min:1|max:256',
        ]);

        $result = $this->authService->register($data);

        if (($result['status'] ?? '') === 'needs_2fa') {
            return ApiResponse::success([
                'status' => 'needs_2fa',
                'hint'   => $result['hint'] ?? null,
            ]);
        }

        return ApiResponse::created($result);
    }

    /** POST /auth/login */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:1',
        ]);

        $result = $this->authService->login($data);
        return ApiResponse::success($result);
    }

    /** POST /auth/refresh */
    public function refresh(Request $request): JsonResponse
    {
        $data = $request->validate([
            'refreshToken' => 'required|string|min:1',
        ]);

        $tokens = $this->authService->refresh($data['refreshToken']);
        return ApiResponse::success($tokens);
    }

    /** POST /auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'refreshToken' => 'required|string|min:1',
        ]);

        $this->authService->logout($data['refreshToken']);
        return ApiResponse::success(['message' => 'Logged out successfully']);
    }

    /** GET /auth/me */
    public function me(Request $request): JsonResponse
    {
        $user = $this->authService->me($request->user()->id);
        return ApiResponse::success(['user' => $user]);
    }
}
