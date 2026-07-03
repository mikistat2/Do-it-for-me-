"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const hf_client_1 = require("./hf.client");
const log_service_1 = require("../services/log.service");
const client_2 = require("@prisma/client");
const matchResultSchema = zod_1.z.object({
    score: zod_1.z.number().min(0).max(100),
    strengths: zod_1.z.array(zod_1.z.string()).default([]),
    weaknesses: zod_1.z.array(zod_1.z.string()).default([]),
    reason: zod_1.z.string(),
    recommendation: zod_1.z.nativeEnum(client_1.MatchRecommendation),
});
const SYSTEM_INSTRUCTION = `You are an expert technical recruiter. Compare a candidate profile
against a job posting and return a strict JSON object with these keys:
- score: integer 0-100 representing overall fit
- strengths: array of short strings
- weaknesses: array of short strings
- reason: one concise paragraph explaining the score
- recommendation: one of STRONG_APPLY, APPLY, CONSIDER, SKIP
Return JSON only, no markdown.`;
const buildPrompt = (job, profile, skills) => `CANDIDATE PROFILE\n` +
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
exports.matchingService = {
    async analyze(job, profile, jobSkills) {
        await log_service_1.logService.info(client_2.LogCategory.AI, 'Requesting job match analysis', {
            jobId: job.id,
        });
        const result = await hf_client_1.hfClient.generateJson({
            prompt: buildPrompt(job, profile, jobSkills),
            systemInstruction: SYSTEM_INSTRUCTION,
        });
        const parsed = matchResultSchema.parse(result);
        return { ...parsed, score: Math.round(parsed.score) };
    },
};
//# sourceMappingURL=matching.service.js.map