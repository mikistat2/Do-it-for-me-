<?php

namespace App\Repositories;

use App\Models\Setting;

class SettingsRepository
{
    public function findByUserId(string $userId): ?Setting
    {
        return Setting::where('user_id', $userId)->first();
    }

    /**
     * Upsert – create with defaults if not exists, otherwise return existing.
     * Mirrors Node's settingsRepository.ensure()
     */
    public function ensure(string $userId): Setting
    {
        return Setting::firstOrCreate(
            ['user_id' => $userId],
            [
                'match_threshold'   => (int) config('app.automation_match_threshold', 70),
                'auto_apply'        => (bool) config('app.automation_auto_apply', false),
                'automation_paused' => true,
            ]
        );
    }

    public function update(string $userId, array $data): Setting
    {
        $setting = Setting::where('user_id', $userId)->firstOrFail();
        $setting->update($data);
        return $setting->fresh();
    }
}
