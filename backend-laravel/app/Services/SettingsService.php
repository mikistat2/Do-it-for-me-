<?php

namespace App\Services;

use App\Models\Setting;
use App\Repositories\SettingsRepository;

class SettingsService
{
    public function __construct(
        private SettingsRepository $settingsRepo
    ) {}

    public function get(string $userId): Setting
    {
        return $this->settingsRepo->ensure($userId);
    }

    public function update(string $userId, array $input): Setting
    {
        $this->settingsRepo->ensure($userId);
        return $this->settingsRepo->update($userId, $input);
    }

    public function setPaused(string $userId, bool $paused): Setting
    {
        $this->settingsRepo->ensure($userId);
        return $this->settingsRepo->update($userId, ['automation_paused' => $paused]);
    }
}
