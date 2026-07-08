<?php

namespace App\Repositories;

use App\Models\RefreshToken;
use Illuminate\Support\Facades\DB;

class RefreshTokenRepository
{
    public function create(array $data): RefreshToken
    {
        return RefreshToken::create([
            'user_id'    => $data['userId'],
            'token_hash' => $data['tokenHash'],
            'expires_at' => $data['expiresAt'],
            'revoked'    => false,
        ]);
    }

    public function findByHash(string $tokenHash): ?RefreshToken
    {
        return RefreshToken::where('token_hash', $tokenHash)->first();
    }

    public function revokeByHash(string $tokenHash): int
    {
        return RefreshToken::where('token_hash', $tokenHash)
            ->update(['revoked' => true]);
    }

    public function revokeAllForUser(string $userId): int
    {
        return RefreshToken::where('user_id', $userId)
            ->where('revoked', false)
            ->update(['revoked' => true]);
    }

    public function deleteExpired(): int
    {
        return RefreshToken::where('expires_at', '<', now())->delete();
    }
}
