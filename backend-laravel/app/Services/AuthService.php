<?php

namespace App\Services;

use App\Jobs\SyncUserChannelsJob;
use App\Models\User;
use App\Repositories\UserRepository;
use App\Repositories\RefreshTokenRepository;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AuthService
{
    public function __construct(
        private UserRepository         $userRepo,
        private SettingsService        $settingsService,
        private TokenService           $tokenService,
        private RefreshTokenRepository $refreshTokenRepo,
        private TelegramAuthService    $telegramAuth
    ) {}

    /**
     * Register a new user with profile + settings defaults.
     * Mirrors Node's authService.register()
     */
    public function register(array $input): array
    {
        try {
            $existing = $this->userRepo->findByEmail($input['email']);
        } catch (\Illuminate\Database\QueryException $e) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                503, 'Database unavailable. Please check your DB_PASSWORD in .env and run php artisan migrate.'
            );
        }

        if ($existing) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'An account with this email already exists');
        }

        $verifyResult = $this->telegramAuth->ensureVerified(
            $input['registrationToken'],
            $input['code'],
            $input['telegramPassword'] ?? null,
        );

        if ($verifyResult['status'] === 'needs_2fa') {
            return [
                'status' => 'needs_2fa',
                'hint'   => $verifyResult['hint'] ?? null,
            ];
        }

        $telegramSession = $verifyResult['session'];

        $user = User::create([
            'email'                => $input['email'],
            'password_hash'        => Hash::make($input['password']),
            'role'                 => 'USER',
            'telegram_user_id'     => $telegramSession->telegram_user_id,
            'telegram_phone'       => $telegramSession->phone,
            'telegram_username'    => $telegramSession->telegram_username,
            'telegram_verified_at' => now(),
        ]);

        // Create profile
        $user->profile()->create([
            'full_name'           => $input['fullName'],
            'email'               => $input['email'],
            'phone'               => $telegramSession->phone,
            'skills'              => [],
            'preferred_roles'     => [],
            'preferred_locations' => [],
            'min_match_score'     => (int) config('app.automation_match_threshold', 70),
        ]);

        // Create settings
        $user->setting()->create([
            'match_threshold' => (int) config('app.automation_match_threshold', 70),
            'auto_apply'      => (bool) config('app.automation_auto_apply', false),
        ]);

        $user->update([
            'telegram_session_path' => $telegramSession->session_path,
        ]);

        $this->telegramAuth->attachSessionToUser($telegramSession, $user->id);

        $tokens = $this->tokenService->issueTokenPair($user->fresh());

        return [
            'user'         => $this->toPublicUser($user->fresh()),
            'accessToken'  => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ];
    }

    /**
     * Validate credentials and return tokens.
     * Mirrors Node's authService.login()
     */
    public function login(array $input): array
    {
        try {
            $user = $this->userRepo->findByEmail($input['email']);
        } catch (\Illuminate\Database\QueryException $e) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(
                503, 'Database unavailable. Please check your DB_PASSWORD in .env and run php artisan migrate.'
            );
        }

        if (!$user || !$user->is_active || !Hash::check($input['password'], $user->password_hash)) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(401, 'Invalid credentials');
        }

        $tokens = $this->tokenService->issueTokenPair($user);

        // Auto-sync the user's Telegram channels in the background
        SyncUserChannelsJob::dispatch($user->id);

        return [
            'user'         => $this->toPublicUser($user),
            'accessToken'  => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ];
    }

    /**
     * Validate a refresh token and return a new token pair.
     * Mirrors Node's authService.refresh()
     */
    public function refresh(string $refreshToken): array
    {
        $stored = $this->refreshTokenRepo->findByHash(hash('sha256', $refreshToken));
        if (!$stored || $stored->revoked || $stored->expires_at->isPast()) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(401, 'Refresh token is no longer valid');
        }

        $user = $this->userRepo->findById($stored->user_id);
        if (!$user || !$user->is_active) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(401, 'Account is no longer active');
        }

        return $this->tokenService->rotateRefreshToken($refreshToken, $user);
    }

    /**
     * Revoke a refresh token.
     * Mirrors Node's authService.logout()
     */
    public function logout(string $refreshToken): void
    {
        $this->tokenService->revoke($refreshToken);
    }

    /**
     * Return public user data for the authenticated user.
     * Mirrors Node's authService.me()
     */
    public function me(string $userId): array
    {
        $user = $this->userRepo->findById($userId);
        if (!$user) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(401, 'Account not found');
        }
        return $this->toPublicUser($user);
    }

    // ─── Private ───────────────────────────────────────────

    private function toPublicUser(User $user): array
    {
        return [
            'id'                 => $user->id,
            'email'              => $user->email,
            'role'               => $user->role,
            'isActive'           => $user->is_active,
            'telegramVerified'   => (bool) $user->telegram_verified_at,
            'telegramUsername'   => $user->telegram_username,
            'createdAt'          => $user->created_at,
        ];
    }
}
