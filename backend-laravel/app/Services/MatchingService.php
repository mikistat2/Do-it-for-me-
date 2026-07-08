<?php

namespace App\Services;

use App\Models\Job;
use App\Models\Profile;
use Illuminate\Support\Facades\Log;

class MatchingService
{
    private const SYSTEM_INSTRUCTION = <<<EOT
You are an expert technical recruiter AI. Your task is to compare a candidate's profile against a job posting and evaluate their fit.

You MUST return ONLY a valid JSON object with exactly these keys:
{
  "score": <integer 0-100>,
  "strengths": ["<short strength 1>", "<short strength 2>", ...],
  "weaknesses": ["<short weakness 1>", "<short weakness 2>", ...],
  "reason": "<one concise paragraph explaining the score>",
  "recommendation": "<one of: STRONG_APPLY, APPLY, CONSIDER, SKIP>"
}

Scoring guidelines:
- 85-100: Strong match — most required skills present, relevant experience
- 70-84:  Good match — many skills overlap, some gaps
- 50-69:  Moderate — partial skill overlap, could be worth trying
- 30-49:  Weak — significant skill gaps, unlikely fit
- 0-29:   Poor — almost no overlap

Return ONLY the JSON object. No markdown, no explanation outside the JSON.
EOT;

    public function __construct(
        private HuggingFaceService $hf,
    ) {}

    public function analyze(Job $job, Profile $profile, array $jobSkills): array
    {
        // Always compute the local score first — it's free and instant
        $localResult = $this->localScore($job, $profile, $jobSkills);

        // Try AI scoring if HuggingFace is configured
        if ($this->hf->isConfigured()) {
            try {
                $prompt = $this->buildPrompt($job, $profile, $jobSkills);
                $aiResult = $this->hf->completeJson(
                    self::SYSTEM_INSTRUCTION,
                    $prompt,
                    maxTokens: 500,
                    temperature: 0.2,
                );

                if ($aiResult && isset($aiResult['score'], $aiResult['recommendation'])) {
                    Log::info('MatchingService: AI scoring succeeded', [
                        'jobId' => $job->id,
                        'aiScore' => $aiResult['score'],
                    ]);

                    return [
                        'score'          => max(0, min(100, (int) $aiResult['score'])),
                        'strengths'      => (array) ($aiResult['strengths'] ?? []),
                        'weaknesses'     => (array) ($aiResult['weaknesses'] ?? []),
                        'reason'         => (string) ($aiResult['reason'] ?? ''),
                        'recommendation' => (string) $aiResult['recommendation'],
                    ];
                }

                Log::info('MatchingService: AI returned invalid JSON, using local score');
            } catch (\Throwable $e) {
                Log::warning('MatchingService: AI scoring failed, using local score', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Return the smart local score (not a dumb fallback)
        return $localResult;
    }

    private function buildPrompt(Job $job, Profile $profile, array $jobSkills): string
    {
        $profileSkills = is_array($profile->skills) ? implode(', ', $profile->skills) : 'n/a';
        $prefRoles = is_array($profile->preferred_roles) ? implode(', ', $profile->preferred_roles) : 'n/a';
        $prefLocs = is_array($profile->preferred_locations) ? implode(', ', $profile->preferred_locations) : 'n/a';
        $expSalary = $profile->expected_salary ?? 'n/a';
        $resume = $profile->resume_text ?? 'n/a';

        $jCompany = $job->company ?? 'n/a';
        $jExp = $job->experience ?? 'n/a';
        $jSalary = $job->salary ?? 'n/a';
        $reqSkills = implode(', ', $jobSkills) ?: 'n/a';

        return <<<PROMPT
CANDIDATE PROFILE
Name: {$profile->full_name}
Skills: {$profileSkills}
Preferred roles: {$prefRoles}
Preferred locations: {$prefLocs}
Expected salary: {$expSalary}
Resume excerpt: {$resume}

JOB POSTING
Title: {$job->title}
Company: {$jCompany}
Experience required: {$jExp}
Salary: {$jSalary}
Remote type: {$job->remote_type}
Required skills: {$reqSkills}
Description: {$job->description}
PROMPT;
    }

    // ─── Smart Local Scoring ──────────────────────────────────────────────
    // Instead of returning a flat 50, this method calculates a real score
    // based on skill overlap, role/title match, location, and salary fit.

    private function localScore(Job $job, Profile $profile, array $jobSkills): array
    {
        $strengths = [];
        $weaknesses = [];
        $score = 0;
        $maxScore = 0;

        // ── 1. Skill overlap (50 points max) ──────────────────────────
        $profileSkills = is_array($profile->skills) ? array_map('strtolower', $profile->skills) : [];

        if (!empty($jobSkills) && !empty($profileSkills)) {
            $maxScore += 50;
            $jobSkillsLower = array_map('strtolower', $jobSkills);
            $matched = array_intersect($profileSkills, $jobSkillsLower);
            $missing = array_diff($jobSkillsLower, $profileSkills);

            $ratio = count($matched) / max(count($jobSkillsLower), 1);
            $score += (int) round($ratio * 50);

            if (count($matched) > 0) {
                $strengths[] = 'Skills match: ' . implode(', ', array_slice(array_values($matched), 0, 5));
            }
            if (count($missing) > 0) {
                $weaknesses[] = 'Missing skills: ' . implode(', ', array_slice(array_values($missing), 0, 5));
            }
        } elseif (empty($jobSkills)) {
            // No job skills listed — give partial credit
            $maxScore += 50;
            $score += 25;
        } else {
            $maxScore += 50;
            $weaknesses[] = 'Profile has no skills listed';
        }

        // ── 2. Title / Role match (20 points max) ────────────────────
        $maxScore += 20;
        $preferredRoles = is_array($profile->preferred_roles) ? array_map('strtolower', $profile->preferred_roles) : [];
        $jobTitleLower = strtolower($job->title ?? '');

        if (!empty($preferredRoles) && $jobTitleLower) {
            $roleMatch = false;
            foreach ($preferredRoles as $role) {
                if (str_contains($jobTitleLower, $role) || str_contains($role, $jobTitleLower)) {
                    $roleMatch = true;
                    break;
                }
                // Fuzzy: check if any word from the role appears in the title
                $roleWords = explode(' ', $role);
                foreach ($roleWords as $word) {
                    if (strlen($word) >= 4 && str_contains($jobTitleLower, $word)) {
                        $roleMatch = true;
                        break 2;
                    }
                }
            }
            if ($roleMatch) {
                $score += 20;
                $strengths[] = 'Job title matches preferred roles';
            } else {
                $score += 5; // partial credit
                $weaknesses[] = 'Job title does not closely match preferred roles';
            }
        } else {
            $score += 10; // neutral if no preferences set
        }

        // ── 3. Location match (15 points max) ────────────────────────
        $maxScore += 15;
        $preferredLocations = is_array($profile->preferred_locations) ? array_map('strtolower', $profile->preferred_locations) : [];
        $remoteType = strtoupper($job->remote_type ?? 'UNKNOWN');

        if ($remoteType === 'REMOTE') {
            $score += 15;
            $strengths[] = 'Remote position — location flexible';
        } elseif (!empty($preferredLocations)) {
            $jobLocations = $job->locations()->pluck('name')->map(fn($l) => strtolower($l))->toArray();
            $locMatch = false;
            foreach ($preferredLocations as $pLoc) {
                foreach ($jobLocations as $jLoc) {
                    if (str_contains($jLoc, $pLoc) || str_contains($pLoc, $jLoc)) {
                        $locMatch = true;
                        break 2;
                    }
                }
            }
            if ($locMatch) {
                $score += 15;
                $strengths[] = 'Job location matches preferences';
            } else {
                $score += 3;
                $weaknesses[] = 'Job location may not match preferred locations';
            }
        } else {
            $score += 8; // neutral
        }

        // ── 4. Salary fit (15 points max) ─────────────────────────────
        $maxScore += 15;
        $expectedSalary = $profile->expected_salary;
        $jobSalary = $job->salary;

        if ($expectedSalary && $jobSalary) {
            // Try to extract a number from the job salary string
            $jobSalaryNum = $this->extractSalaryNumber($jobSalary);
            if ($jobSalaryNum > 0) {
                if ($jobSalaryNum >= $expectedSalary) {
                    $score += 15;
                    $strengths[] = 'Salary meets or exceeds expectations';
                } elseif ($jobSalaryNum >= $expectedSalary * 0.8) {
                    $score += 10;
                    $strengths[] = 'Salary is close to expectations';
                } else {
                    $score += 3;
                    $weaknesses[] = 'Salary may be below expectations';
                }
            } else {
                $score += 8; // can't parse — neutral
            }
        } else {
            $score += 8; // not enough data — neutral
        }

        // ── Normalize to 0-100 ───────────────────────────────────────
        $normalizedScore = $maxScore > 0 ? (int) round(($score / $maxScore) * 100) : 50;
        $normalizedScore = max(0, min(100, $normalizedScore));

        // ── Derive recommendation ────────────────────────────────────
        $recommendation = match (true) {
            $normalizedScore >= 85 => 'STRONG_APPLY',
            $normalizedScore >= 70 => 'APPLY',
            $normalizedScore >= 50 => 'CONSIDER',
            default                => 'SKIP',
        };

        // Build reason
        $reason = "Local analysis: score {$normalizedScore}/100. ";
        if (!empty($strengths)) {
            $reason .= 'Strengths include ' . strtolower(implode('; ', array_slice($strengths, 0, 3))) . '. ';
        }
        if (!empty($weaknesses)) {
            $reason .= 'Areas of concern: ' . strtolower(implode('; ', array_slice($weaknesses, 0, 3))) . '.';
        }

        return [
            'score'          => $normalizedScore,
            'strengths'      => $strengths,
            'weaknesses'     => $weaknesses,
            'reason'         => trim($reason),
            'recommendation' => $recommendation,
        ];
    }

    /**
     * Try to extract a numeric salary value from a free-text salary string.
     */
    private function extractSalaryNumber(string $salary): int
    {
        // Remove currency symbols, commas, spaces
        $clean = preg_replace('/[^0-9.\-]/', ' ', $salary);

        // Look for numbers — take the first reasonable one
        if (preg_match('/(\d[\d,]*(?:\.\d+)?)/', $clean, $m)) {
            $num = (int) str_replace([',', '.'], '', $m[1]);
            // If it looks like "50k" => multiply
            if (preg_match('/(\d+)\s*k\b/i', $salary, $km)) {
                return (int) $km[1] * 1000;
            }
            return $num;
        }

        return 0;
    }
}
