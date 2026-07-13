<?php

namespace App\Services;

use App\Models\Job;
use App\Models\Profile;
use Illuminate\Support\Facades\Log;

class MatchingService
{
    private const SYSTEM_INSTRUCTION = <<<EOT
You are a world-class technical recruiter AI. Your job is to meticulously compare a candidate's FULL profile against a job posting and produce a rigorous match evaluation.

IMPORTANT RULES:
- You MUST score EVERY job, even if it has no contact email, no phone number, or incomplete information.
- Missing contact info (email/phone) must NOT affect the match score at all.
- Handle multilingual job posts (English, Amharic, mixed languages) equally and fairly.
- Extract meaning from the job description even if the format is non-standard.

SCORING METHODOLOGY — evaluate ALL of the following dimensions:

1. SKILL MATCH (0-35 points)
   - Count how many of the job's required/preferred skills the candidate possesses.
   - Award partial credit for related/adjacent skills (e.g. React ≈ Vue, Python ≈ Django).
   - Consider skills from the resume text that may not be listed explicitly in the skills array.
   - If the job doesn't list specific skills, infer from the job title and description.

2. ROLE & TITLE FIT (0-20 points)
   - Does the candidate's preferred roles list align with this job title?
   - Does the resume indicate experience in this kind of role?
   - Award full marks if the candidate's career trajectory points toward this role.

3. EXPERIENCE LEVEL (0-15 points)
   - Compare the job's required experience with clues in the resume.
   - A junior applying for a senior role should lose points; over-qualified is a minor penalty.
   - If experience requirements are unclear, award 8 (slight benefit of the doubt).

4. LOCATION & REMOTE FIT (0-10 points)
   - Remote jobs should get full marks if the candidate is open to remote.
   - Compare the candidate's preferred locations with the job's location.
   - If location info is missing on either side, award 5 (neutral).

5. SALARY ALIGNMENT (0-10 points)
   - If both salaries are known, check if the job meets/exceeds expectations.
   - If salary data is missing on either side, award 5 (neutral).

6. PORTFOLIO & ONLINE PRESENCE (0-10 points)
   - Bonus points if the candidate has a portfolio, GitHub, or LinkedIn URL.
   - These demonstrate professionalism and verifiable work.

FINAL SCORE = sum of all dimensions (0-100).

RECOMMENDATION RULES:
- 85-100 → STRONG_APPLY  (excellent fit, auto-apply worthy)
- 70-84  → APPLY          (good fit, worth applying)
- 50-69  → CONSIDER       (partial fit, review manually)
- 0-49   → SKIP           (poor fit)

You MUST return ONLY a valid JSON object with exactly these keys:
{
  "score": <integer 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "reason": "<one concise paragraph explaining the score>",
  "recommendation": "<one of: STRONG_APPLY, APPLY, CONSIDER, SKIP>"
}

Return ONLY the JSON. No markdown, no extra text, no explanation outside the JSON.
EOT;

    public function __construct(
        private HuggingFaceService $hf,
    ) {}

    public function analyze(Job $job, Profile $profile, array $jobSkills): array
    {
        // Always attempt AI scoring when HuggingFace is configured
        if ($this->hf->isConfigured()) {
            $prompt = $this->buildPrompt($job, $profile, $jobSkills);

            // First attempt
            $aiResult = $this->tryAiScoring($prompt, 0.15, 'primary');

            // If first attempt fails, retry with slightly different temperature
            if (!$aiResult) {
                Log::info('MatchingService: Retrying AI scoring with adjusted parameters');
                $aiResult = $this->tryAiScoring($prompt, 0.10, 'retry');
            }

            if ($aiResult) {
                Log::info('MatchingService: AI scoring succeeded', [
                    'jobId'   => $job->id,
                    'aiScore' => $aiResult['score'],
                    'hasEmail' => !empty($job->contact_email),
                ]);

                return [
                    'score'          => max(0, min(100, (int) $aiResult['score'])),
                    'strengths'      => (array) ($aiResult['strengths'] ?? []),
                    'weaknesses'     => (array) ($aiResult['weaknesses'] ?? []),
                    'reason'         => (string) ($aiResult['reason'] ?? ''),
                    'recommendation' => (string) $aiResult['recommendation'],
                ];
            }

            Log::warning('MatchingService: AI scoring failed after retries, falling back to local scoring', [
                'jobId' => $job->id,
            ]);
        }

        // Fallback to local scoring only when HF is not configured or all retries failed
        return $this->localScore($job, $profile, $jobSkills);
    }

    /**
     * Attempt AI scoring with the given temperature.
     */
    private function tryAiScoring(string $prompt, float $temperature, string $label): ?array
    {
        try {
            $aiResult = $this->hf->completeJson(
                self::SYSTEM_INSTRUCTION,
                $prompt,
                maxTokens: 600,
                temperature: $temperature,
            );

            if ($aiResult && isset($aiResult['score'], $aiResult['recommendation'])) {
                // Validate the recommendation value
                $validRecs = ['STRONG_APPLY', 'APPLY', 'CONSIDER', 'SKIP'];
                if (!in_array(strtoupper($aiResult['recommendation']), $validRecs)) {
                    $aiResult['recommendation'] = $this->deriveRecommendation((int) $aiResult['score']);
                } else {
                    $aiResult['recommendation'] = strtoupper($aiResult['recommendation']);
                }
                return $aiResult;
            }

            Log::warning("MatchingService: AI {$label} attempt returned invalid JSON");
        } catch (\Throwable $e) {
            Log::warning("MatchingService: AI {$label} attempt failed", [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Derive recommendation from score (used when AI returns invalid recommendation string).
     */
    private function deriveRecommendation(int $score): string
    {
        return match (true) {
            $score >= 85 => 'STRONG_APPLY',
            $score >= 70 => 'APPLY',
            $score >= 50 => 'CONSIDER',
            default      => 'SKIP',
        };
    }

    private function buildPrompt(Job $job, Profile $profile, array $jobSkills): string
    {
        $profileSkills = is_array($profile->skills) ? implode(', ', $profile->skills) : 'none listed';
        $prefRoles = is_array($profile->preferred_roles) ? implode(', ', $profile->preferred_roles) : 'none listed';
        $prefLocs = is_array($profile->preferred_locations) ? implode(', ', $profile->preferred_locations) : 'none listed';
        $expSalary = $profile->expected_salary ? number_format($profile->expected_salary) : 'not specified';
        $resume = !empty($profile->resume_text) ? $profile->resume_text : 'No resume provided';
        // Truncate resume to save tokens, but give enough context
        if (strlen($resume) > 4000) {
            $resume = substr($resume, 0, 4000) . '... [truncated]';
        }

        $portfolio = $profile->portfolio ?? 'none';
        $linkedin = $profile->linkedin ?? 'none';
        $github = $profile->github ?? 'none';
        $email = $profile->email ?? 'none';
        $phone = $profile->phone ?? 'none';

        $jCompany = $job->company ?? 'not specified';
        $jExp = $job->experience ?? 'not specified';
        $jSalary = $job->salary ?? 'not specified';
        $reqSkills = !empty($jobSkills) ? implode(', ', $jobSkills) : 'none explicitly listed';
        $jDescription = $job->description ?? '';
        if (strlen($jDescription) > 4000) {
            $jDescription = substr($jDescription, 0, 4000) . '... [truncated]';
        }

        $contactEmail = $job->contact_email ?? 'not provided';
        $contactPhone = $job->contact_phone ?? 'not provided';

        return <<<PROMPT
═══════════════════════════════════════════
CANDIDATE PROFILE — Evaluate carefully
═══════════════════════════════════════════
Full Name: {$profile->full_name}
Email: {$email}
Phone: {$phone}
Portfolio: {$portfolio}
LinkedIn: {$linkedin}
GitHub: {$github}

Listed Skills: {$profileSkills}
Preferred Roles: {$prefRoles}
Preferred Locations: {$prefLocs}
Expected Salary: {$expSalary}

Resume / Experience:
{$resume}

═══════════════════════════════════════════
JOB POSTING — Compare against the candidate
═══════════════════════════════════════════
Title: {$job->title}
Company: {$jCompany}
Experience Required: {$jExp}
Salary Offered: {$jSalary}
Remote Type: {$job->remote_type}
Required Skills: {$reqSkills}
Contact Email: {$contactEmail}
Contact Phone: {$contactPhone}

Description:
{$jDescription}

═══════════════════════════════════════════
TASK: Score this candidate for this job using all 6 dimensions described in your instructions.
NOTE: The presence or absence of contact email/phone in the job posting must NOT affect the score.
Score purely on skill match, role fit, experience, location, salary, and portfolio.
PROMPT;
    }

    // ─── Smart Local Scoring ──────────────────────────────────────────────
    // Mirrors the 6-dimension AI scoring rubric so local and AI scores
    // are on the same scale and produce comparable results.

    private function localScore(Job $job, Profile $profile, array $jobSkills): array
    {
        $strengths = [];
        $weaknesses = [];
        $score = 0;

        // ── 1. Skill Match (0-35 points) ─────────────────────────────
        $profileSkills = is_array($profile->skills) ? array_map('strtolower', $profile->skills) : [];

        if (!empty($jobSkills) && !empty($profileSkills)) {
            $jobSkillsLower = array_map('strtolower', $jobSkills);
            $matched = array_intersect($profileSkills, $jobSkillsLower);
            $missing = array_diff($jobSkillsLower, $profileSkills);

            // Also check for adjacent/related skills
            $adjacentMap = [
                'react' => ['vue', 'angular', 'svelte', 'next.js'],
                'vue' => ['react', 'angular', 'svelte', 'nuxt'],
                'angular' => ['react', 'vue', 'typescript'],
                'python' => ['django', 'flask', 'fastapi'],
                'django' => ['python', 'flask'],
                'node' => ['node.js', 'express', 'nestjs', 'javascript'],
                'node.js' => ['node', 'express', 'nestjs', 'javascript'],
                'javascript' => ['typescript', 'node', 'node.js', 'react', 'vue'],
                'typescript' => ['javascript', 'angular', 'node.js'],
                'php' => ['laravel', 'symfony'],
                'laravel' => ['php', 'symfony'],
                'java' => ['spring', 'kotlin'],
                'spring' => ['java', 'kotlin'],
                'postgresql' => ['mysql', 'sql'],
                'mysql' => ['postgresql', 'sql'],
                'sql' => ['postgresql', 'mysql'],
                'aws' => ['gcp', 'azure'],
                'gcp' => ['aws', 'azure'],
                'azure' => ['aws', 'gcp'],
                'docker' => ['kubernetes'],
                'kubernetes' => ['docker'],
                'c#' => ['.net'],
                '.net' => ['c#'],
                'flutter' => ['dart', 'kotlin', 'swift'],
            ];

            $adjacentHits = 0;
            foreach ($missing as $missingSkill) {
                $related = $adjacentMap[$missingSkill] ?? [];
                foreach ($related as $adj) {
                    if (in_array($adj, $profileSkills)) {
                        $adjacentHits++;
                        break;
                    }
                }
            }

            $directRatio = count($matched) / max(count($jobSkillsLower), 1);
            $adjacentBonus = $adjacentHits * 0.5 / max(count($jobSkillsLower), 1);
            $totalRatio = min(1.0, $directRatio + $adjacentBonus);

            $skillPoints = (int) round($totalRatio * 35);
            $score += $skillPoints;

            if (count($matched) > 0) {
                $strengths[] = 'Skills match: ' . implode(', ', array_slice(array_values($matched), 0, 5));
            }
            if ($adjacentHits > 0) {
                $strengths[] = 'Has related/adjacent skills';
            }
            if (count($missing) > $adjacentHits) {
                $reallyMissing = array_diff(array_values($missing), array_keys(array_filter(
                    $adjacentMap,
                    fn($related) => !empty(array_intersect($related, $profileSkills)),
                    ARRAY_FILTER_USE_BOTH
                )));
                if (!empty($reallyMissing)) {
                    $weaknesses[] = 'Missing skills: ' . implode(', ', array_slice(array_values($reallyMissing), 0, 5));
                }
            }
        } elseif (empty($jobSkills)) {
            $score += 18; // No job skills listed — partial credit
        } else {
            $weaknesses[] = 'Profile has no skills listed';
        }

        // ── 2. Role & Title Fit (0-20 points) ────────────────────────
        $preferredRoles = is_array($profile->preferred_roles) ? array_map('strtolower', $profile->preferred_roles) : [];
        $jobTitleLower = strtolower($job->title ?? '');

        if (!empty($preferredRoles) && $jobTitleLower) {
            $roleMatch = false;
            foreach ($preferredRoles as $role) {
                if (str_contains($jobTitleLower, $role) || str_contains($role, $jobTitleLower)) {
                    $roleMatch = true;
                    break;
                }
                // Fuzzy: check if significant words overlap
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
                $score += 5;
                $weaknesses[] = 'Job title doesn\'t closely match preferred roles';
            }
        } else {
            $score += 10; // neutral if no preferences set
        }

        // ── 3. Experience Level (0-15 points) ────────────────────────
        $hasResume = !empty($profile->resume_text) && strlen($profile->resume_text) > 50;
        $jobExp = $job->experience ?? '';

        if ($hasResume) {
            // Check if resume mentions years of experience
            $resumeLower = strtolower($profile->resume_text);
            $hasExpMention = preg_match('/(\d+)\+?\s*(?:years?|yrs?)/', $resumeLower, $expMatch);

            if ($hasExpMention && !empty($jobExp)) {
                $candidateYears = (int) $expMatch[1];
                $jobYearsMatch = preg_match('/(\d+)/', $jobExp, $jobExpMatch);
                $jobYears = $jobYearsMatch ? (int) $jobExpMatch[1] : 0;

                if ($jobYears > 0 && $candidateYears >= $jobYears) {
                    $score += 15;
                    $strengths[] = "Has {$candidateYears}+ years experience (job requires {$jobYears})";
                } elseif ($jobYears > 0 && $candidateYears >= $jobYears - 1) {
                    $score += 10;
                    $strengths[] = 'Experience is close to requirements';
                } else {
                    $score += 5;
                    $weaknesses[] = 'May lack required experience level';
                }
            } else {
                $score += 10; // has resume but can't compare
                $strengths[] = 'Resume provided';
            }
        } else {
            $score += 5; // no resume
            $weaknesses[] = 'No resume text to evaluate experience';
        }

        // ── 4. Location & Remote Fit (0-10 points) ───────────────────
        $preferredLocations = is_array($profile->preferred_locations) ? array_map('strtolower', $profile->preferred_locations) : [];
        $remoteType = strtoupper($job->remote_type ?? 'UNKNOWN');

        if ($remoteType === 'REMOTE') {
            $score += 10;
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
                $score += 10;
                $strengths[] = 'Job location matches preferences';
            } else {
                $score += 3;
                $weaknesses[] = 'Job location may not match preferences';
            }
        } else {
            $score += 5; // neutral
        }

        // ── 5. Salary Alignment (0-10 points) ────────────────────────
        $expectedSalary = $profile->expected_salary;
        $jobSalary = $job->salary;

        if ($expectedSalary && $jobSalary) {
            $jobSalaryNum = $this->extractSalaryNumber($jobSalary);
            if ($jobSalaryNum > 0) {
                if ($jobSalaryNum >= $expectedSalary) {
                    $score += 10;
                    $strengths[] = 'Salary meets or exceeds expectations';
                } elseif ($jobSalaryNum >= $expectedSalary * 0.8) {
                    $score += 7;
                    $strengths[] = 'Salary is close to expectations';
                } else {
                    $score += 2;
                    $weaknesses[] = 'Salary may be below expectations';
                }
            } else {
                $score += 5;
            }
        } else {
            $score += 5; // not enough data — neutral
        }

        // ── 6. Portfolio & Online Presence (0-10 points) ─────────────
        $presencePoints = 0;
        $presenceItems = [];

        if (!empty($profile->portfolio)) {
            $presencePoints += 4;
            $presenceItems[] = 'portfolio';
        }
        if (!empty($profile->github)) {
            $presencePoints += 3;
            $presenceItems[] = 'GitHub';
        }
        if (!empty($profile->linkedin)) {
            $presencePoints += 3;
            $presenceItems[] = 'LinkedIn';
        }

        $presencePoints = min(10, $presencePoints);
        $score += $presencePoints;

        if (!empty($presenceItems)) {
            $strengths[] = 'Online presence: ' . implode(', ', $presenceItems);
        } elseif ($presencePoints === 0) {
            $weaknesses[] = 'No portfolio, GitHub, or LinkedIn linked';
        }

        // ── Final score (already 0-100 from the 6 dimensions) ────────
        $normalizedScore = max(0, min(100, $score));

        // ── Derive recommendation ────────────────────────────────────
        $recommendation = $this->deriveRecommendation($normalizedScore);

        // Build reason
        $reason = "Local analysis: score {$normalizedScore}/100. ";
        if (!empty($strengths)) {
            $reason .= 'Strengths include ' . strtolower(implode('; ', array_slice($strengths, 0, 4))) . '. ';
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
        // If it looks like "50k" => multiply
        if (preg_match('/(\d+)\s*k\b/i', $salary, $km)) {
            return (int) $km[1] * 1000;
        }

        // Remove currency symbols, commas, spaces
        $clean = preg_replace('/[^0-9.\-]/', ' ', $salary);

        // Look for numbers — take the first reasonable one
        if (preg_match('/(\d[\d,]*(?:\.\d+)?)/', $clean, $m)) {
            return (int) str_replace([',', '.'], '', $m[1]);
        }

        return 0;
    }
}
