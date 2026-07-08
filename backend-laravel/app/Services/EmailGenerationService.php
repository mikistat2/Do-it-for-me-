<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Generates job application email content via the HuggingFace inference API.
 * Falls back to a skill-aware template if the AI is unavailable.
 */
class EmailGenerationService
{
    private const SYSTEM_INSTRUCTION = <<<EOT
You are a professional career coach writing a job application email.

Write a compelling, professional email that:
- Opens with genuine interest in the specific role and company
- Highlights the candidate's relevant skills and experience
- Shows understanding of the job requirements
- Is concise (under 250 words for the body)
- Sounds natural, not generic or AI-generated
- Ends with a clear call to action

You MUST return ONLY a valid JSON object with exactly these keys:
{"subject": "your email subject line", "body": "the full email body text"}

Do NOT include markdown formatting. Return ONLY the JSON object.
EOT;

    public function __construct(
        private HuggingFaceService $hf,
    ) {}

    public function generate(mixed $job, mixed $profile): array
    {
        if ($this->hf->isConfigured()) {
            try {
                $prompt = $this->buildPrompt($job, $profile);
                $result = $this->hf->completeJson(
                    self::SYSTEM_INSTRUCTION,
                    $prompt,
                    maxTokens: 700,
                    temperature: 0.7,
                );

                if ($result && !empty($result['subject']) && !empty($result['body'])) {
                    Log::info('EmailGenerationService: AI email generated', [
                        'jobTitle' => $job->title ?? 'unknown',
                    ]);
                    return [
                        'subject' => $result['subject'],
                        'body'    => $result['body'],
                    ];
                }

                Log::info('EmailGenerationService: AI returned invalid response, using smart fallback');
            } catch (\Throwable $e) {
                Log::warning('EmailGenerationService: AI generation failed, using fallback', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->smartFallback($job, $profile);
    }

    // ─── Private ───────────────────────────────────────────

    private function buildPrompt(mixed $job, mixed $profile): string
    {
        $skills = is_array($profile->skills) ? implode(', ', $profile->skills) : 'various technical skills';
        $resume = $profile->resume_text ?? '';
        $prefRoles = is_array($profile->preferred_roles) ? implode(', ', $profile->preferred_roles) : '';

        $company = $job->company ?? 'your company';
        $description = $job->description ?? '';
        // Truncate long descriptions to save tokens
        if (strlen($description) > 800) {
            $description = substr($description, 0, 800) . '...';
        }

        return <<<PROMPT
JOB DETAILS:
Title: {$job->title}
Company: {$company}
Description: {$description}

CANDIDATE PROFILE:
Name: {$profile->full_name}
Skills: {$skills}
Preferred roles: {$prefRoles}
Resume summary: {$resume}

Write a job application email for this candidate applying to this specific position.
PROMPT;
    }

    /**
     * Generate a template-based email that's still personalized with actual
     * profile data — much better than the old 3-line fallback.
     */
    private function smartFallback(mixed $job, mixed $profile): array
    {
        $name = $profile->full_name ?? 'Applicant';
        $title = $job->title ?? 'the position';
        $company = $job->company ?? 'your organization';
        $skills = is_array($profile->skills) ? $profile->skills : [];

        $subject = "Application for {$title}" . ($company !== 'your organization' ? " at {$company}" : '');

        // Build a skill highlights paragraph
        $skillText = '';
        if (!empty($skills)) {
            $topSkills = array_slice($skills, 0, 5);
            $skillText = "My core competencies include " . implode(', ', $topSkills) . ". ";
        }

        // Build experience paragraph from resume
        $resumeText = '';
        if (!empty($profile->resume_text)) {
            $firstSentence = strtok($profile->resume_text, '.');
            if ($firstSentence && strlen($firstSentence) > 20) {
                $resumeText = trim($firstSentence) . ". ";
            }
        }

        $body = "Dear Hiring Manager,\n\n"
            . "I am writing to express my strong interest in the {$title} position"
            . ($company !== 'your organization' ? " at {$company}" : '') . ". "
            . $skillText
            . $resumeText
            . "\n\n"
            . "I am confident that my skills and experience align well with the requirements of this role, "
            . "and I would welcome the opportunity to discuss how I can contribute to your team.\n\n"
            . "I have attached my resume for your review and would be happy to provide additional information "
            . "or references upon request. I look forward to hearing from you.\n\n"
            . "Best regards,\n{$name}";

        if (!empty($profile->email)) {
            $body .= "\n{$profile->email}";
        }
        if (!empty($profile->phone)) {
            $body .= "\n{$profile->phone}";
        }
        if (!empty($profile->linkedin)) {
            $body .= "\n{$profile->linkedin}";
        }

        return [
            'subject' => $subject,
            'body'    => $body,
        ];
    }
}

