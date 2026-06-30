import { Job, MatchRecommendation, Profile } from '@prisma/client';
import { z } from 'zod';
import { geminiClient } from './gemini.client';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

const matchResultSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  reason: z.string(),
  recommendation: z.nativeEnum(MatchRecommendation),
});

export type MatchAnalysis = z.infer<typeof matchResultSchema>;

const SYSTEM_INSTRUCTION = `You are an expert technical recruiter. Compare a candidate profile
against a job posting and return a strict JSON object with these keys:
- score: integer 0-100 representing overall fit
- strengths: array of short strings
- weaknesses: array of short strings
- reason: one concise paragraph explaining the score
- recommendation: one of STRONG_APPLY, APPLY, CONSIDER, SKIP
Return JSON only, no markdown.`;

const buildPrompt = (job: Job, profile: Profile, skills: string[]): string =>
  `CANDIDATE PROFILE\n` +
  `Name: ${profile.fullName}\n` +
  `Skills: ${profile.skills.join(', ') || 'n/a'}\n` +
  `Preferred roles: ${profile.preferredRoles.join(', ') || 'n/a'}\n` +
  `Preferred locations: ${profile.preferredLocations.join(', ') || 'n/a'}\n` +
  `Expected salary: ${profile.expectedSalary ?? 'n/a'}\n` +
  `Resume: ${profile.resumeText ?? 'n/a'}\n\n` +
  `JOB POSTING\n` +
  `Title: ${job.title}\n` +
  `Company: ${job.company ?? 'n/a'}\n` +
  `Experience: ${job.experience ?? 'n/a'}\n` +
  `Salary: ${job.salary ?? 'n/a'}\n` +
  `Remote: ${job.remoteType}\n` +
  `Required skills: ${skills.join(', ') || 'n/a'}\n` +
  `Description: ${job.description}`;

export const matchingService = {
  async analyze(
    job: Job,
    profile: Profile,
    jobSkills: string[],
  ): Promise<MatchAnalysis> {
    await logService.info(LogCategory.AI, 'Requesting job match analysis', {
      jobId: job.id,
    });
    const result = await geminiClient.generateJson<unknown>({
      prompt: buildPrompt(job, profile, jobSkills),
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
      schema: {
        type: 'OBJECT',
        properties: {
          score: { type: 'INTEGER' },
          strengths: { type: 'ARRAY', items: { type: 'STRING' } },
          weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
          reason: { type: 'STRING' },
          recommendation: { type: 'STRING', enum: ['STRONG_APPLY', 'APPLY', 'CONSIDER', 'SKIP'] },
        },
        required: ['score', 'strengths', 'weaknesses', 'reason', 'recommendation'],
      },
    });
    const parsed = matchResultSchema.parse(result);
    return { ...parsed, score: Math.round(parsed.score) };
  },
};
