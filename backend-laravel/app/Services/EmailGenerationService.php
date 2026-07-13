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
You are a senior career strategist writing a personalized job application email.

RULES:
1. The email MUST feel hand-written, NOT template-generated or AI-written.
2. Open with a specific hook referencing the company or role — never "I am writing to apply..."
3. Highlight 2-3 of the candidate's MOST RELEVANT skills for THIS specific job.
4. If the candidate has a portfolio, GitHub, or LinkedIn, weave ONE link naturally into the body (e.g. "you can see my recent work at [portfolio]").
5. Keep the body under 200 words — recruiters skim.
6. End with confidence and a clear call to action.
7. Include a professional signature block with the candidate's name, email, phone (if available), and links (portfolio/LinkedIn/GitHub) on separate lines.

OUTPUT FORMAT — follow it EXACTLY:
The very first line must be the subject prefixed with "SUBJECT: ".
Then one blank line.
Then the full email body including the signature.
Do NOT use markdown, do NOT use JSON, do NOT add any commentary before or after.
EOT;

    public function __construct(
        private HuggingFaceService $hf,
    ) {}

    public function generate(mixed $job, mixed $profile): array
    {
        if ($this->hf->isConfigured()) {
            try {
                $prompt = $this->buildPrompt($job, $profile);
                $text = $this->hf->complete(
                    self::SYSTEM_INSTRUCTION,
                    $prompt,
                    maxTokens: 1200,
                    temperature: 0.65,
                );

                $result = $text ? $this->parseEmailText($text) : null;

                if ($result) {
                    Log::info('EmailGenerationService: AI email generated', [
                        'jobTitle' => $job->title ?? 'unknown',
                    ]);
                    return $result;
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

    /**
     * Parse the "SUBJECT: ...\n\n<body>" format the AI is instructed to use.
     * Also tolerates a JSON response in case the model ignores the format.
     */
    private function parseEmailText(string $text): ?array
    {
        $text = trim($text);

        // Model ignored instructions and returned JSON anyway
        if (str_starts_with($text, '{')) {
            $json = $this->hf->extractJson($text);
            if ($json && !empty($json['subject']) && !empty($json['body'])) {
                return ['subject' => trim($json['subject']), 'body' => trim($json['body'])];
            }
            return null;
        }

        if (preg_match('/^\s*SUBJECT\s*:\s*(.+?)\s*$/mi', $text, $m, PREG_OFFSET_CAPTURE)) {
            $subject = trim($m[1][0]);
            $body = trim(substr($text, $m[0][1] + strlen($m[0][0])));

            if ($subject !== '' && strlen($body) > 40) {
                return ['subject' => $subject, 'body' => $body];
            }
        }

        return null;
    }

    private function buildPrompt(mixed $job, mixed $profile): string
    {
        $skills = is_array($profile->skills) ? implode(', ', $profile->skills) : 'various technical skills';
        $resume = !empty($profile->resume_text) ? $profile->resume_text : '';
        if (strlen($resume) > 800) {
            $resume = substr($resume, 0, 800) . '...';
        }
        $prefRoles = is_array($profile->preferred_roles) ? implode(', ', $profile->preferred_roles) : '';

        $company = $job->company ?? 'the company';
        $description = $job->description ?? '';
        if (strlen($description) > 800) {
            $description = substr($description, 0, 800) . '...';
        }

        $portfolio = $profile->portfolio ?? 'none';
        $linkedin = $profile->linkedin ?? 'none';
        $github = $profile->github ?? 'none';
        $email = $profile->email ?? 'none';
        $phone = $profile->phone ?? 'none';

        return <<<PROMPT
JOB DETAILS:
Title: {$job->title}
Company: {$company}
Description: {$description}

CANDIDATE PROFILE:
Name: {$profile->full_name}
Email: {$email}
Phone: {$phone}
Skills: {$skills}
Preferred roles: {$prefRoles}
Portfolio: {$portfolio}
LinkedIn: {$linkedin}
GitHub: {$github}
Resume summary: {$resume}

Write a personalized job application email for this candidate applying to this specific position.
Include the candidate's relevant links in the signature.
PROMPT;
    }

    /**
     * Generate a template-based email that's still personalized with actual
     * profile data — includes portfolio, GitHub, LinkedIn, and all contact info.
     */
    private function smartFallback(mixed $job, mixed $profile): array
    {
        $name = $profile->full_name ?? 'Applicant';
        $title = $job->title ?? 'the position';
        $company = $job->company ?? 'your organization';
        $skills = is_array($profile->skills) ? $profile->skills : [];

        $subject = "Application for {$title}" . ($company !== 'your organization' ? " — {$name}" : '');

        // Build skill highlights — pick top 5 most relevant
        $skillText = '';
        if (!empty($skills)) {
            $topSkills = array_slice($skills, 0, 5);
            $lastSkill = array_pop($topSkills);
            if (!empty($topSkills)) {
                $skillText = "My core competencies include " . implode(', ', $topSkills) . " and {$lastSkill}. ";
            } else {
                $skillText = "My core competency is {$lastSkill}. ";
            }
        }

        // Build experience paragraph from resume
        $resumeParagraph = '';
        if (!empty($profile->resume_text)) {
            // Take the first 2 sentences
            $sentences = preg_split('/(?<=[.!?])\s+/', $profile->resume_text, 3);
            $excerpt = implode(' ', array_slice($sentences, 0, 2));
            if (strlen($excerpt) > 30) {
                $resumeParagraph = trim($excerpt) . " ";
            }
        }

        // Build portfolio mention
        $portfolioMention = '';
        if (!empty($profile->portfolio)) {
            $portfolioMention = "You can review samples of my work at {$profile->portfolio}. ";
        } elseif (!empty($profile->github)) {
            $portfolioMention = "You can explore my projects on GitHub at {$profile->github}. ";
        }

        $body = "Dear Hiring Manager,\n\n"
            . "I am excited to apply for the {$title} position"
            . ($company !== 'your organization' ? " at {$company}" : '') . ". "
            . $skillText
            . $resumeParagraph
            . "\n\n"
            . $portfolioMention
            . "I am confident that my background aligns well with what you're looking for, "
            . "and I would love the opportunity to discuss how I can contribute to your team.\n\n"
            . "I have attached my resume for your consideration and am happy to provide additional information "
            . "or references. I look forward to hearing from you.\n\n"
            . "Best regards,\n"
            . $name;

        // Build signature block with all available contact info
        $signature = [];
        if (!empty($profile->email)) {
            $signature[] = "Email: {$profile->email}";
        }
        if (!empty($profile->phone)) {
            $signature[] = "Phone: {$profile->phone}";
        }
        if (!empty($profile->portfolio)) {
            $signature[] = "Portfolio: {$profile->portfolio}";
        }
        if (!empty($profile->linkedin)) {
            $signature[] = "LinkedIn: {$profile->linkedin}";
        }
        if (!empty($profile->github)) {
            $signature[] = "GitHub: {$profile->github}";
        }

        if (!empty($signature)) {
            $body .= "\n" . implode("\n", $signature);
        }

        return [
            'subject' => $subject,
            'body'    => $body,
        ];
    }
}
