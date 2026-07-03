"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailGenerationService = void 0;
const zod_1 = require("zod");
const hf_client_1 = require("./hf.client");
const log_service_1 = require("../services/log.service");
const client_1 = require("@prisma/client");
const emailSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
});
const SYSTEM_INSTRUCTION = `You write professional, personalized job application emails.
Return a strict JSON object with keys "subject" and "body".
The body must be professional, concise, reference the candidate's portfolio,
skills, and relevant experience, and be ready to send.
CRITICAL: You must return valid JSON. Do NOT use literal newlines in the string values. Use \\n instead.`;
const buildPrompt = (job, profile) => `Write a job application email.\n\n` +
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
exports.emailGenerationService = {
    async generate(job, profile) {
        await log_service_1.logService.info(client_1.LogCategory.AI, 'Generating application email', {
            jobId: job.id,
        });
        const result = await hf_client_1.hfClient.generateJson({
            prompt: buildPrompt(job, profile),
            systemInstruction: SYSTEM_INSTRUCTION,
        });
        return emailSchema.parse(result);
    },
};
//# sourceMappingURL=emailGeneration.service.js.map