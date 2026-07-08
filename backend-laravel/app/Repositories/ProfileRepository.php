<?php

namespace App\Repositories;

use App\Models\Profile;

class ProfileRepository
{
    public function findByUserId(string $userId): ?Profile
    {
        return Profile::where('user_id', $userId)->first();
    }

    public function update(string $userId, array $data): Profile
    {
        $profile = Profile::where('user_id', $userId)->firstOrFail();
        $profile->update($data);
        return $profile->fresh();
    }

    public function upsert(string $userId, array $create, array $update): Profile
    {
        $profile = Profile::where('user_id', $userId)->first();
        if ($profile) {
            $profile->update($update);
            return $profile->fresh();
        }
        return Profile::create(array_merge($create, ['user_id' => $userId]));
    }
}
