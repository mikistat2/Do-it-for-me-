<?php

namespace App\Services;

use App\Models\Profile;
use App\Repositories\ProfileRepository;

class ProfileService
{
    public function __construct(
        private ProfileRepository $profileRepo
    ) {}

    public function get(string $userId): Profile
    {
        $profile = $this->profileRepo->findByUserId($userId);
        if (!$profile) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Profile not found');
        }
        return $profile;
    }

    public function update(string $userId, array $input): Profile
    {
        $this->get($userId); // ensure exists
        return $this->profileRepo->update($userId, $input);
    }
}
