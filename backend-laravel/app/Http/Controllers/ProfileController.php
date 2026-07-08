<?php

namespace App\Http\Controllers;

use App\Services\ProfileService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private ProfileService $profileService) {}

    /** GET /profile */
    public function get(Request $request): JsonResponse
    {
        $profile = $this->profileService->get($request->user()->id);
        return ApiResponse::success($profile);
    }

    /** PUT /profile */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName'            => 'sometimes|string|min:1|max:120',
            'email'               => 'sometimes|email',
            'phone'               => 'sometimes|nullable|string|max:40',
            'portfolio'           => 'sometimes|nullable|url',
            'linkedin'            => 'sometimes|nullable|url',
            'github'              => 'sometimes|nullable|url',
            'resumeText'          => 'sometimes|nullable|string|max:20000',
            'skills'              => 'sometimes|array|max:200',
            'skills.*'            => 'string|min:1',
            'preferredRoles'      => 'sometimes|array|max:100',
            'preferredRoles.*'    => 'string|min:1',
            'preferredLocations'  => 'sometimes|array|max:100',
            'preferredLocations.*'=> 'string|min:1',
            'expectedSalary'      => 'sometimes|nullable|integer|min:0',
            'minMatchScore'       => 'sometimes|integer|min:0|max:100',
        ]);

        // Map camelCase → snake_case for Eloquent
        $mapped = array_filter([
            'full_name'           => $data['fullName']           ?? null,
            'email'               => $data['email']              ?? null,
            'phone'               => $data['phone']              ?? null,
            'portfolio'           => $data['portfolio']          ?? null,
            'linkedin'            => $data['linkedin']           ?? null,
            'github'              => $data['github']             ?? null,
            'resume_text'         => $data['resumeText']         ?? null,
            'skills'              => $data['skills']             ?? null,
            'preferred_roles'     => $data['preferredRoles']     ?? null,
            'preferred_locations' => $data['preferredLocations'] ?? null,
            'expected_salary'     => $data['expectedSalary']     ?? null,
            'min_match_score'     => $data['minMatchScore']      ?? null,
        ], fn($v) => $v !== null);

        $profile = $this->profileService->update($request->user()->id, $mapped);
        return ApiResponse::success($profile);
    }
}
