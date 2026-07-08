<?php

namespace App\Services;

use App\Enums\RemoteType;

class JobDetectorService
{
    private const JOB_KEYWORDS = [
        'hiring', 'job', 'vacancy', 'vacancies', 'position', 'opening',
        'we are looking for', 'apply', 'recruit', 'developer', 'engineer',
        'role', 'full-time', 'part-time', 'remote', 'internship',
        'የስራው መጠሪያ', 'የስራው አይነት', 'የስራ አይነት', 'የስራው ቦታ', 'የስራ ቦታ',
        'ተፈላጊ ችሎታ', 'የስራ ልምድ', 'ደሞዝ', 'የስራ ማስታወቂያ', 'ክፍት የስራ ቦታ',
        'የስራው ዝርዝር', 'ስራ opportunities', 'opportunity', '@freelance_ethio',
        'afriwork', 'afriworket',
    ];

    private const SKILL_DICTIONARY = [
        'javascript', 'typescript', 'node', 'node.js', 'react', 'vue',
        'angular', 'python', 'django', 'flask', 'java', 'spring', 'go',
        'golang', 'rust', 'php', 'laravel', 'ruby', 'rails', 'c++', 'c#',
        '.net', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker',
        'kubernetes', 'aws', 'gcp', 'azure', 'graphql', 'rest', 'express',
        'nestjs', 'tailwind', 'figma', 'flutter', 'kotlin', 'swift',
    ];

    private const EMAIL_REGEX = '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/';
    private const PHONE_REGEX = '/(\+?\d[\d\s().-]{7,}\d)/';
    private const SALARY_REGEX = '/(?:salary|compensation|pay|ደሞዝ)\s*[:\-]?\s*([^\n]+)|(\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?(?:\s?(?:k|usd|per month|\/month|\/year))?)/i';
    private const EXPERIENCE_REGEX = '/(\d+\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?|ዓመት|ዓመታት))\s*(?:of\s*)?(?:experience|ልምድ)?/i';
    private const TITLE_REGEX = '/(?:position|role|title|hiring(?:\s+for)?|we(?:\'re| are) looking for(?: an?)?|የስራው መጠሪያ)\s*[:\-]?\s*([^\n]{3,60})/i';
    private const COMPANY_REGEX = '/(?:company|at|@|ድርጅት|ቀጣሪ)\s*[:\-]?\s*([^\n]{1,50})/';
    private const DEADLINE_REGEX = '/(?:deadline|apply before|closing date|last date|ማመልከቻ ማብቂያ(?: ቀን)?)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[A-Za-z]+\s+[0-9]{1,2}(?:,?\s*[0-9]{4})?)/i';
    private const LOCATION_REGEX = '/(?:location|based in|located in)\s*[:\-]?\s*([A-Za-z][A-Za-z ,]{2,40})/i';

    public function detectJob(string $rawText): array
    {
        $text = $rawText ?? '';
        $lower = strtolower($text);

        $keywordHits = 0;
        foreach (self::JOB_KEYWORDS as $kw) {
            if (str_contains($lower, $kw)) {
                $keywordHits++;
            }
        }

        $hasEmail = preg_match(self::EMAIL_REGEX, $text);
        $isJobPost = $keywordHits >= 2 || ($keywordHits >= 1 && $hasEmail);

        preg_match(self::EMAIL_REGEX, $text, $emailMatch);
        preg_match(self::PHONE_REGEX, $text, $phoneMatch);
        preg_match(self::SALARY_REGEX, $text, $salaryMatch);
        preg_match(self::EXPERIENCE_REGEX, $text, $experienceMatch);
        preg_match(self::TITLE_REGEX, $text, $titleMatch);
        preg_match(self::COMPANY_REGEX, $text, $companyMatch);
        preg_match(self::DEADLINE_REGEX, $text, $deadlineMatch);

        $skills = [];
        foreach (self::SKILL_DICTIONARY as $skill) {
            $escapedSkill = preg_quote($skill, '/');
            if (preg_match("/(^|[^a-z]){$escapedSkill}([^a-z]|$)/i", $lower)) {
                $skills[] = $skill;
            }
        }
        $skills = array_unique($skills);

        $remoteType = $this->detectRemoteType($lower);
        $locations = $this->detectLocations($text);

        $firstLine = explode("\n", $text)[0] ?? '';
        $fallbackTitle = $this->normalize($firstLine);
        if (empty($fallbackTitle)) {
            $fallbackTitle = 'Untitled job post';
        } else {
            $fallbackTitle = substr($fallbackTitle, 0, 80);
        }

        return [
            'isJobPost' => $isJobPost,
            'title' => !empty($titleMatch[1]) ? $this->normalize($titleMatch[1]) : $fallbackTitle,
            'company' => !empty($companyMatch[1]) ? $this->normalize($companyMatch[1]) : null,
            'email' => $emailMatch[0] ?? null,
            'phone' => !empty($phoneMatch[1]) ? $this->normalize($phoneMatch[1]) : null,
            'skills' => array_values($skills),
            'experience' => !empty($experienceMatch[0]) ? $this->normalize($experienceMatch[0]) : null,
            'salary' => !empty($salaryMatch[1]) ? $this->normalize($salaryMatch[1]) : (!empty($salaryMatch[2]) ? $this->normalize($salaryMatch[2]) : null),
            'locations' => $locations,
            'remoteType' => $remoteType,
            'deadline' => !empty($deadlineMatch[1]) ? $this->parseDeadline($deadlineMatch[1]) : null,
            'description' => $this->normalize($text),
            'contentHash' => $this->hashContent($text),
        ];
    }

    private function detectRemoteType(string $lower): string
    {
        $isRemote = preg_match('/\bremote\b|work from home|wfh/', $lower);
        $isOnsite = preg_match('/\bon-?site\b|in office|in-person/', $lower);
        $isHybrid = preg_match('/\bhybrid\b/', $lower);

        if ($isHybrid || ($isRemote && $isOnsite)) {
            return 'HYBRID';
        }
        if ($isRemote) {
            return 'REMOTE';
        }
        if ($isOnsite) {
            return 'ONSITE';
        }
        return 'UNKNOWN';
    }

    private function detectLocations(string $text): array
    {
        $results = [];
        if (preg_match_all(self::LOCATION_REGEX, $text, $matches)) {
            foreach ($matches[1] as $match) {
                $value = preg_replace('/[.,]$/', '', $this->normalize($match));
                if ($value) {
                    $results[] = $value;
                }
            }
        }
        return array_values(array_unique($results));
    }

    private function parseDeadline(string $value): ?string
    {
        $timestamp = strtotime($value);
        if ($timestamp !== false) {
            return date('Y-m-d H:i:s', $timestamp);
        }

        if (preg_match('/([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})/', $value, $dmy)) {
            $day = $dmy[1];
            $month = $dmy[2];
            $year = strlen($dmy[3]) === 2 ? '20' . $dmy[3] : $dmy[3];
            $timestamp = strtotime("$year-$month-$day");
            if ($timestamp !== false) {
                return date('Y-m-d H:i:s', $timestamp);
            }
        }

        return null;
    }

    private function normalize(string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', $text));
    }

    public function hashContent(string $text): string
    {
        return hash('sha256', strtolower($this->normalize($text)));
    }
}
