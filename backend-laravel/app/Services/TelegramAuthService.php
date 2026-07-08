<?php

namespace App\Services;

use App\Models\TelegramAuthSession;
use App\Models\User;
use danog\MadelineProto\API;
use danog\MadelineProto\Settings;
use danog\MadelineProto\Settings\AppInfo;
use danog\MadelineProto\Settings\Connection;
use danog\MadelineProto\Settings\RPC;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TelegramAuthService
{
    private const SESSION_TTL_MINUTES = 30;

    /**
     * Send a Telegram login code to the given phone number.
     * Reuses an existing registration token when resending.
     */
    public function sendCode(string $phone, ?string $existingToken = null): array
    {
        $this->ensureRuntimeLimits();
        $phone = $this->normalizePhone($phone);

        if (User::where('telegram_phone', $phone)->whereNotNull('telegram_verified_at')->exists()) {
            throw new ConflictHttpException('This phone number is already linked to an account');
        }

        if ($existingToken) {
            $session = TelegramAuthSession::find($existingToken);

            if ($session && !$session->isExpired() && $session->phone === $phone) {
                try {
                    $sentCode = $this->withApi($session->session_path, function (API $api) use ($phone) {
                        return $api->phoneLogin($phone);
                    });
                } catch (\Throwable $e) {
                    Log::error('Telegram resend-code failed', ['phone' => $phone, 'error' => $e->getMessage()]);
                    throw new HttpException(502, 'Failed to resend Telegram verification code: ' . $e->getMessage());
                }

                $session->update([
                    'status'     => 'WAITING_CODE',
                    'expires_at' => now()->addMinutes(self::SESSION_TTL_MINUTES),
                ]);

                return [
                    'registrationToken' => $session->id,
                    'codeType'          => $sentCode['type']['_'] ?? 'existing',
                    'message'           => 'A new verification code was sent to your Telegram app',
                ];
            }
        }

        $token = (string) Str::uuid();
        $sessionPath = $this->pendingSessionPath($token);
        $this->ensureSessionDirectory(dirname($sessionPath));

        try {
            $sentCode = $this->withApi($sessionPath, function (API $api) use ($phone) {
                return $api->phoneLogin($phone);
            });
        } catch (\Throwable $e) {
            $this->cleanupSessionFile($sessionPath);
            Log::error('Telegram send-code failed', ['phone' => $phone, 'error' => $e->getMessage()]);
            throw new HttpException(502, 'Failed to send Telegram verification code: ' . $e->getMessage());
        }

        TelegramAuthSession::create([
            'id'           => $token,
            'phone'        => $phone,
            'session_path' => $sessionPath,
            'status'       => 'WAITING_CODE',
            'expires_at'   => now()->addMinutes(self::SESSION_TTL_MINUTES),
        ]);

        Log::info('Telegram verification session created', ['token' => $token, 'phone' => $phone]);

        return [
            'registrationToken' => $token,
            'codeType'          => $sentCode['type']['_'] ?? 'unknown',
            'message'           => 'A verification code was sent to your Telegram app',
        ];
    }

    /**
     * Verify OTP (and optional 2FA) then return the updated session.
     *
     * @return array{status: string, session?: TelegramAuthSession, hint?: string|null}
     */
    public function ensureVerified(string $token, string $code, ?string $password = null): array
    {
        $this->ensureRuntimeLimits();
        $session = $this->findActiveSession($token);

        if ($session->status === 'LOGGED_IN') {
            return ['status' => 'verified', 'session' => $session];
        }

        try {
            return $this->withApi($session->session_path, function (API $api) use ($session, $code, $password) {
                if ($session->status === 'WAITING_PASSWORD') {
                    if (!$password) {
                        throw new HttpException(422, 'Telegram 2FA password is required');
                    }
                    $api->complete2faLogin($password);
                    return $this->finalizeSession($session, $api);
                }

                $authorization = $api->completePhoneLogin($code);

                if (($authorization['_'] ?? '') === 'account.password') {
                    if (!$password) {
                        $session->update([
                            'status'     => 'WAITING_PASSWORD',
                            'expires_at' => now()->addMinutes(self::SESSION_TTL_MINUTES),
                        ]);
                        return [
                            'status' => 'needs_2fa',
                            'hint'   => $authorization['hint'] ?? null,
                        ];
                    }

                    $api->complete2faLogin($password);
                }

                if (($authorization['_'] ?? '') === 'account.needSignup') {
                    throw new HttpException(422, 'This Telegram account is not fully set up. Please complete signup in the Telegram app first.');
                }

                return $this->finalizeSession($session, $api);
            });
        } catch (HttpException $e) {
            throw $e;
        } catch (\Throwable $e) {
    Log::error('🔥 Telegram OTP FAILED FULL DEBUG', [
        'message' => $e->getMessage(),
        'file'    => $e->getFile(),
        'line'    => $e->getLine(),
        'trace'   => $e->getTraceAsString(),
        'token'   => $token,
        'status'  => $session->status,
        'phone'   => $session->phone ?? null,
        'session_path' => $session->session_path ?? null,
    ]);

    throw new HttpException(
        422,
        'Telegram verification failed. Check laravel.log for full details.'
    );
}
    }

    /**
     * Verify the Telegram login code (standalone endpoint).
     */
    public function verify(string $token, string $code, ?string $password = null): array
    {
        $result = $this->ensureVerified($token, $code, $password);
        if ($result['status'] === 'needs_2fa') {
            return $result;
        }

        return [
            'status'           => 'verified',
            'telegramUserId'   => (string) $result['session']->telegram_user_id,
            'telegramUsername' => $result['session']->telegram_username,
        ];
    }

    /**
     * Complete 2FA after code verification returned needs_2fa.
     */
    public function verify2fa(string $token, string $password): array
    {
        $session = $this->findActiveSession($token);
        if ($session->status !== 'WAITING_PASSWORD') {
            throw new HttpException(422, '2FA is not required for this session');
        }

        $result = $this->ensureVerified($token, '', $password);
        return [
            'status'           => 'verified',
            'telegramUserId'   => (string) $result['session']->telegram_user_id,
            'telegramUsername' => $result['session']->telegram_username,
        ];
    }

    public function attachSessionToUser(TelegramAuthSession $session, string $userId): void
    {
        if ($session->status !== 'LOGGED_IN' || !$session->telegram_user_id) {
            throw new HttpException(422, 'Telegram account is not verified');
        }

        // We leave the session files in their original directory because MadelineProto 
        // may hold file locks on Windows that prevent copying or renaming.
        $session->delete();
    }

    public function getVerifiedSession(string $token): TelegramAuthSession
    {
        $session = $this->findActiveSession($token);

        if ($session->status !== 'LOGGED_IN' || !$session->telegram_user_id) {
            throw new HttpException(422, 'Telegram verification is required before registering');
        }

        return $session;
    }

    public function makeUserApi(User $user): API
    {
        if (!$user->telegram_session_path || !$user->telegram_verified_at) {
            throw new HttpException(422, 'Telegram account is not linked');
        }

        return $this->makeApi($user->telegram_session_path);
    }

    public function userSessionPath(string $userId): string
    {
        return $this->sessionRoot() . "/users/{$userId}/session.madeline";
    }

    // ─── Private ───────────────────────────────────────────

    private function finalizeSession(TelegramAuthSession $session, API $api): array
    {
        $self = $api->getSelf();
        $telegramUserId = (int) ($self['id'] ?? 0);

        if (!$telegramUserId) {
            throw new HttpException(502, 'Failed to read Telegram account info');
        }

        if (User::where('telegram_user_id', $telegramUserId)->exists()) {
            throw new ConflictHttpException('This Telegram account is already linked to another user');
        }

        $session->update([
            'status'            => 'LOGGED_IN',
            'telegram_user_id'  => $telegramUserId,
            'telegram_username' => $self['username'] ?? null,
            'expires_at'        => now()->addMinutes(self::SESSION_TTL_MINUTES),
        ]);

        return ['status' => 'verified', 'session' => $session->fresh()];
    }

    private function findActiveSession(string $token): TelegramAuthSession
    {
        $session = TelegramAuthSession::find($token);

        if (!$session) {
            Log::warning('Telegram session not found', ['token' => $token]);
            throw new NotFoundHttpException('Verification session not found. Please request a new code.');
        }

        if ($session->isExpired()) {
            Log::warning('Telegram session expired', [
                'token'      => $token,
                'expires_at' => $session->expires_at,
                'now'        => now(),
            ]);
            throw new NotFoundHttpException('Verification session expired. Please request a new code.');
        }

        $session->update(['expires_at' => now()->addMinutes(self::SESSION_TTL_MINUTES)]);

        return $session;
    }

    private function withApi(string $sessionPath, callable $callback): mixed
    {
        $api = $this->makeApi($sessionPath);

        $result = $callback($api);
        unset($api);
        gc_collect_cycles();
        
        // Give Windows file system a tiny moment to release the lock
        usleep(50000); 

        return $result;
    }

    private function makeApi(string $sessionPath): API
    {
        $apiId   = config('app.telegram_api_id');
        $apiHash = config('app.telegram_api_hash');

        if (!$apiId || !$apiHash) {
            throw new HttpException(503, 'Telegram API credentials are not configured on the server');
        }

        $settings = new Settings();
        $settings->setAppInfo(
            (new AppInfo())
                ->setApiId((int) $apiId)
                ->setApiHash($apiHash)
        );
        $settings->setConnection(
            (new Connection())
                ->setTimeout(30.0)
                ->setRetry(true)
        );
        $settings->setRpc(
            (new RPC())
                ->setRpcDropTimeout(120)
                ->setFloodTimeout(60)
        );

        return new API($sessionPath, $settings);
    }

    private function ensureRuntimeLimits(): void
    {
        @set_time_limit(120);
        @ini_set('max_execution_time', '120');
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^\d+]/', '', trim($phone));

        if (!str_starts_with($phone, '+')) {
            throw new HttpException(422, 'Phone number must include country code (e.g. +1234567890)');
        }

        if (strlen($phone) < 8 || strlen($phone) > 16) {
            throw new HttpException(422, 'Invalid phone number format');
        }

        return $phone;
    }

    private function sessionRoot(): string
    {
        $root = config('app.telegram_session_root');

        if (!$root) {
            $root = storage_path('app/telegram_sessions');
        }

        $root = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $root), DIRECTORY_SEPARATOR);

        if (!File::isDirectory($root)) {
            File::makeDirectory($root, 0755, true);
        }

        return $root;
    }

    private function pendingSessionPath(string $token): string
    {
        return $this->sessionRoot() . "/pending/{$token}/session.madeline";
    }

    private function ensureSessionDirectory(string $path): void
    {
        if (!File::isDirectory($path)) {
            File::makeDirectory($path, 0755, true);
        }
    }

    private function cleanupSessionFile(string $sessionPath): void
    {
        $dir = dirname($sessionPath);
        if (File::isDirectory($dir)) {
            File::deleteDirectory($dir);
        }
    }
}
