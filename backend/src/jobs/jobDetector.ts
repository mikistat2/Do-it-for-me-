import crypto from 'crypto';
import { RemoteType } from '@prisma/client';

export interface ParsedJob {
  isJobPost: boolean;
  title: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: string | null;
  salary: string | null;
  locations: string[];
  remoteType: RemoteType;
  deadline: Date | null;
  description: string;
  contentHash: string;
}

const JOB_KEYWORDS = [
  'hiring',
  'job',
  'vacancy',
  'vacancies',
  'position',
  'opening',
  'we are looking for',
  'apply',
  'recruit',
  'developer',
  'engineer',
  'role',
  'full-time',
  'part-time',
  'remote',
  'internship',
  'የስራው መጠሪያ',
  'የስራ አይነት',
  'የስራ ቦታ',
  'ተፈላጊ ችሎታ',
  'የስራ ልምድ',
  'ደሞዝ',
  'የስራ ማስታወቂያ',
  'ክፍት የስራ ቦታ',
];

const SKILL_DICTIONARY = [
  'javascript',
  'typescript',
  'node',
  'node.js',
  'react',
  'vue',
  'angular',
  'python',
  'django',
  'flask',
  'java',
  'spring',
  'go',
  'golang',
  'rust',
  'php',
  'laravel',
  'ruby',
  'rails',
  'c++',
  'c#',
  '.net',
  'sql',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'docker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
  'graphql',
  'rest',
  'express',
  'nestjs',
  'tailwind',
  'figma',
  'flutter',
  'kotlin',
  'swift',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;
const SALARY_REGEX =
  /(?:salary|compensation|pay|ደሞዝ)\s*[:\-]?\s*([^\n]+)|(\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?(?:\s?(?:k|usd|per month|\/month|\/year))?)/i;
const EXPERIENCE_REGEX =
  /(\d+\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?|ዓመት|ዓመታት))\s*(?:of\s*)?(?:experience|ልምድ)?/i;
const TITLE_REGEX =
  /(?:position|role|title|hiring(?:\s+for)?|we(?:'re| are) looking for(?: an?)?|የስራው መጠሪያ)\s*[:\-]?\s*([^\n]{3,60})/i;
const COMPANY_REGEX =
  /(?:company|at|@|ድርጅት|ቀጣሪ)\s*[:\-]?\s*([^\n]{1,50})/;
const DEADLINE_REGEX =
  /(?:deadline|apply before|closing date|last date|ማመልከቻ ማብቂያ)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[A-Za-z]+\s+[0-9]{1,2}(?:,?\s*[0-9]{4})?)/i;

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

const hashContent = (text: string): string =>
  crypto.createHash('sha256').update(normalize(text).toLowerCase()).digest('hex');

export const detectJob = (rawText: string): ParsedJob => {
  const text = rawText ?? '';
  const lower = text.toLowerCase();

  const keywordHits = JOB_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const hasEmail = EMAIL_REGEX.test(text);
  const isJobPost = keywordHits >= 2 || (keywordHits >= 1 && hasEmail);

  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);
  const salaryMatch = text.match(SALARY_REGEX);
  const experienceMatch = text.match(EXPERIENCE_REGEX);
  const titleMatch = text.match(TITLE_REGEX);
  const companyMatch = text.match(COMPANY_REGEX);
  const deadlineMatch = text.match(DEADLINE_REGEX);

  const skills = SKILL_DICTIONARY.filter((skill) =>
    new RegExp(`(^|[^a-z])${skill.replace(/[.+#]/g, '\\$&')}([^a-z]|$)`, 'i').test(
      lower,
    ),
  );

  const remoteType = detectRemoteType(lower);
  const locations = detectLocations(text);

  const fallbackTitle =
    normalize(text.split('\n')[0] ?? '').slice(0, 80) || 'Untitled job post';

  return {
    isJobPost,
    title: titleMatch ? normalize(titleMatch[1]) : fallbackTitle,
    company: companyMatch ? normalize(companyMatch[1]) : null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? normalize(phoneMatch[1]) : null,
    skills: Array.from(new Set(skills)),
    experience: experienceMatch ? normalize(experienceMatch[0]) : null,
    salary: salaryMatch ? normalize(salaryMatch[1] ?? salaryMatch[2] ?? '') || null : null,
    locations,
    remoteType,
    deadline: deadlineMatch ? parseDeadline(deadlineMatch[1]) : null,
    description: normalize(text),
    contentHash: hashContent(text),
  };
};

const detectRemoteType = (lower: string): RemoteType => {
  const isRemote = /\bremote\b|work from home|wfh/.test(lower);
  const isOnsite = /\bon-?site\b|in office|in-person/.test(lower);
  const isHybrid = /\bhybrid\b/.test(lower);
  if (isHybrid || (isRemote && isOnsite)) {
    return RemoteType.HYBRID;
  }
  if (isRemote) {
    return RemoteType.REMOTE;
  }
  if (isOnsite) {
    return RemoteType.ONSITE;
  }
  return RemoteType.UNKNOWN;
};

const LOCATION_REGEX =
  /(?:location|based in|located in)\s*[:\-]?\s*([A-Za-z][A-Za-z ,]{2,40})/gi;

const detectLocations = (text: string): string[] => {
  const results = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = LOCATION_REGEX.exec(text)) !== null) {
    const value = normalize(match[1]).replace(/[.,]$/, '');
    if (value) {
      results.add(value);
    }
  }
  return Array.from(results);
};

const parseDeadline = (value: string): Date | null => {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const dmy = value.match(/([0-9]{1,2})[\/\-.]([0-9]{1,2})[\/\-.]([0-9]{2,4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export { hashContent };
