<?php

namespace App\Services;

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
    private const SALARY_REGEX = '/(?:salary|compensation|pay|ደሞዝ)\s*[:-]?\s*([^\n]+)|(\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?(?:\s?(?:k|usd|per month|\/month|\/year))?)/i';
    private const EXPERIENCE_REGEX = '/(\d+\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?|ዓመት|ዓመታት))\s*(?:of\s*)?(?:experience|ልምድ)?/i';
    
    private const STOP_WORDS = '(?=\s*(?:Location|Requirements|Responsibilities|Job Title|Title|Company|Salary|Experience|How to|Deadline|Contact)\b|$)';
    
    private const TITLE_REGEX = '/(?:position|role|title|hiring(?:\s+for)?|we are looking for(?: an?)?|የስራው መጠሪያ)\s*[:-]?\s*(.{2,60}?)(?:' . self::STOP_WORDS . ')/iu';
    private const COMPANY_REGEX = '/(?:^|\s)(?:company|ድርጅት|ቀጣሪ)\s*[:-]?\s*(.{2,50}?)(?:' . self::STOP_WORDS . ')/iu';
    private const DEADLINE_REGEX = '/(?:deadline|apply before|closing date|last date|ማመልከቻ ማብቂያ(?: ቀን)?)\s*[:-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[A-Za-z]+\s+[0-9]{1,2}(?:,?\s*[0-9]{4})?)/i';
    private const LOCATION_REGEX = '/(?:location|based in|located in)\s*[:-]?\s*(.{2,40}?)(?:' . self::STOP_WORDS . ')/iu';

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

        $isJobPost = $keywordHits >= 1;

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
        $telegram = $this->detectTelegramContact($text);

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
            'telegram' => $telegram,
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

    /**
     * Extract a Telegram contact handle from a job post.
     *
     * Preference order:
     *   1. A handle appearing right after contact-style wording
     *      ("DM @user", "apply @user", "contact @user", "telegram: @user", …)
     *   2. A t.me/username or telegram.me/username link
     *   3. Any standalone @handle (never the "@" inside an email address)
     *
     * Returns the username WITHOUT the leading "@", or null.
     */
    /** Promotional channel tags commonly appended to posts — never a DM contact. */
    private const TELEGRAM_TAG_DENYLIST = [
        'freelance_ethio', 'afriwork', 'afriworket', 'ethiojobs', 'ethio_jobs',
        'effoyjobs', 'effoy_jobs', 'fanajobs', 'fana_jobs', 'maroset',
        'afriworkamharic',
    ];

    /**
     * Matches Telegram bot deep links: t.me/SomeBot?start=payload or
     * t.me/SomeBot/appname?startapp=payload (Mini App direct links).
     */
    private const APPLY_LINK_REGEX = '~(?:https?://)?t(?:elegram)?\.me/([A-Za-z][A-Za-z0-9_]{3,31})(?:/[A-Za-z0-9_]+)?\?(?:start|startapp)=([\w-]+)~i';

    /**
     * Extract a Telegram bot application deep link — the "View Details /
     * Apply" button many job channels (Afriwork etc.) attach to posts.
     *
     * Checks the message's inline keyboard buttons first, then falls back
     * to deep links written in the post text. Only links carrying a
     * start/startapp payload count — a bare channel link is not an apply
     * button.
     */
    public function extractApplyUrl(string $text, ?array $replyMarkup = null): ?string
    {
        // 1. Inline keyboard buttons (replyInlineMarkup → rows → buttons)
        foreach (($replyMarkup['rows'] ?? []) as $row) {
            foreach (($row['buttons'] ?? []) as $button) {
                $url = $button['url'] ?? null;
                if ($url && preg_match(self::APPLY_LINK_REGEX, $url)) {
                    return $this->normalizeApplyUrl($url);
                }
            }
        }

        // 2. Deep links inside the post text
        if (preg_match(self::APPLY_LINK_REGEX, $text, $m)) {
            return $this->normalizeApplyUrl($m[0]);
        }

        return null;
    }

    /**
     * Split an apply deep link into its bot username and start payload.
     * Returns null for startapp (Mini App) links — those can only be
     * opened by the user, not pre-launched server-side.
     *
     * @return array{bot: string, param: string}|null
     */
    public function parseStartBotLink(string $url): ?array
    {
        if (preg_match('~(?:https?://)?t(?:elegram)?\.me/([A-Za-z][A-Za-z0-9_]{3,31})\?start=([\w-]+)~i', $url, $m)) {
            return ['bot' => $m[1], 'param' => $m[2]];
        }
        return null;
    }

    private function normalizeApplyUrl(string $url): string
    {
        if (!preg_match('~^https?://~i', $url)) {
            $url = 'https://' . $url;
        }
        return substr($url, 0, 500);
    }

    private function detectTelegramContact(string $text): ?string
    {
        // 1. Handle near contact-style wording (same or following ~40 chars).
        //    The lookbehind rejects the "@" inside email addresses.
        $contactContext = '/(?:dm|contact|apply|message|text|telegram|inbox|reach|via|send)[^\n@]{0,40}(?<![\w.])@([A-Za-z][A-Za-z0-9_]{4,31})\b/iu';
        if (preg_match_all($contactContext, $text, $m)) {
            foreach ($m[1] as $handle) {
                if ($this->isUsableTelegramHandle($handle)) {
                    return $handle;
                }
            }
        }

        // 2. t.me / telegram.me links (t.me/joinchat and t.me/+invite are groups)
        if (preg_match_all('~(?:https?://)?t(?:elegram)?\.me/([A-Za-z][A-Za-z0-9_]{3,31})\b~i', $text, $m)) {
            foreach ($m[1] as $handle) {
                if (strtolower($handle) !== 'joinchat' && $this->isUsableTelegramHandle($handle)) {
                    return $handle;
                }
            }
        }

        // 3. Any standalone @handle — the lookbehind rejects the "@" inside
        //    email addresses (preceded by a word character or dot)
        if (preg_match_all('/(?<![\w@.])@([A-Za-z][A-Za-z0-9_]{4,31})\b/u', $text, $m)) {
            foreach ($m[1] as $handle) {
                if ($this->isUsableTelegramHandle($handle)) {
                    return $handle;
                }
            }
        }

        return null;
    }

    private function isUsableTelegramHandle(string $handle): bool
    {
        $lower = strtolower($handle);

        // Bot accounts can't receive a free-text application email — bot
        // application flows are handled through the apply_url deep link.
        if (str_ends_with($lower, 'bot')) {
            return false;
        }

        return !in_array($lower, self::TELEGRAM_TAG_DENYLIST, true);
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
