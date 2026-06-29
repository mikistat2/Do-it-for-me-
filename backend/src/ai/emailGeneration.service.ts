import { Job, Profile } from '@prisma/client';
import { z } from 'zod';
import { geminiClient } from './gemini.client';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

const emailSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type GeneratedEmail = z.infer<typeof emailSchema>;

const SYSTEM_INSTRUCTION = `You write professional, personalized job application emails.
Return a strict JSON object with keys "subject" and "body".
The body must be professional, concise, reference the candidate's portfolio,
skills, and relevant experience, and be ready to send. Return JSON only.`;

const buildPrompt = (job: Job, profile: Profile): string =>
  `Write a job application email.\n\n` +
  `CANDIDATE\n` +
  `Name: ${profile.fullName}\n` +
  `Email: ${profile.email}\n` +
  `Phone: ${profile.phone ?? 'n/a'}\n` +
  `Portfolio: ${profile.portfolio ?? 'n/a'}\n` +
  `LinkedIn: ${profile.linkedin ?? 'n/a'}\n` +
  `GitHub: ${profile.github ?? 'n/a'}\n` +
  `Skills: ${profile.skills.join(', ') || 'n/a'}\n` +
  `Experience summary: ${profile.resumeText ?? 'n/a'}\n\n` +
  `JOB\n` +
  `Title: ${job.title}\n` +
  `Company: ${job.company ?? 'n/a'}\n` +
  `Description: ${job.description}`;

export const emailGenerationService = {
  async generate(job: Job, profile: Profile): Promise<GeneratedEmail> {
    await logService.info(LogCategory.AI, 'Generating application email', {
      jobId: job.id,
    });
    const result = await geminiClient.generateJson<unknown>({
      prompt: buildPrompt(job, profile),
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.6,
    });
    return emailSchema.parse(result);
  },
};
