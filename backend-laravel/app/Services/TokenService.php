<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\RefreshTokenRepository;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Facades\JWTFactory;

class TokenService
{
    public function __construct(
        private RefreshTokenRepository $refreshTokenRepo
    ) {}

    /**
     * Issue a new access + refresh token pair and persist the refresh token hash.
     * Mirrors Node's tokenService.issueTokenPair()
     */
    public function issueTokenPair(User $user): array
    {
        $accessToken  = JWTAuth::fromUser($user);
        $refreshToken = $this->generateRefreshToken();

        $ttlSeconds = (int) config('jwt.refresh_ttl', 604800);
        $expiresAt  = now()->addSeconds($ttlSeconds);

        $this->refreshTokenRepo->create([
            'userId'    => $user->id,
            'tokenHash' => $this->hashToken($refreshToken),
            'expiresAt' => $expiresAt,
        ]);

        return [
            'accessToken'  => $accessToken,
            'refreshToken' => $refreshToken,
        ];
    }

    /**
     * Revoke old token and issue a fresh pair.
     * Mirrors Node's tokenService.rotateRefreshToken()
     */
    public function rotateRefreshToken(string $oldToken, User $user): array
    {
        $this->refreshTokenRepo->revokeByHash($this->hashToken($oldToken));
        return $this->issueTokenPair($user);
    }

    /**
     * Check if a raw refresh token is still active (not revoked, not expired).
     */
    public function isRefreshTokenActive(string $token): bool
    {
        $stored = $this->refreshTokenRepo->findByHash($this->hashToken($token));
        if (!$stored || $stored->revoked) {
            return false;
        }
        return $stored->expires_at->isFuture();
    }

    public function revoke(string $token): void
    {
        $this->refreshTokenRepo->revokeByHash($this->hashToken($token));
    }

    public function revokeAll(string $userId): void
    {
        $this->refreshTokenRepo->revokeAllForUser($userId);
    }

    // ─── Private ───────────────────────────────────────────

    private function generateRefreshToken(): string
    {
        return bin2hex(random_bytes(40));
    }

    private function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
