"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reprocessOpenJobs = exports.applicationEngine = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../database/prisma");
const jobDetector_1 = require("./jobDetector");
const decisionRules_1 = require("./decisionRules");
const telegramMessage_repository_1 = require("../repositories/telegramMessage.repository");
const jobIngestion_repository_1 = require("../repositories/jobIngestion.repository");
const job_repository_1 = require("../repositories/job.repository");
const draft_repository_1 = require("../repositories/draft.repository");
const application_repository_1 = require("../repositories/application.repository");
const profile_repository_1 = require("../repositories/profile.repository");
const settings_repository_1 = require("../repositories/settings.repository");
const matching_service_1 = require("../ai/matching.service");
const emailGeneration_service_1 = require("../ai/emailGeneration.service");
const application_service_1 = require("../services/application.service");
const notification_service_1 = require("../services/notification.service");
const log_service_1 = require("../services/log.service");
const client_2 = require("@prisma/client");
const HIGH_SCORE_THRESHOLD = 85;
exports.applicationEngine = {
    async processMessage(message) {
        const parsed = (0, jobDetector_1.detectJob)(message.rawText);
        const stored = await telegramMessage_repository_1.telegramMessageRepository.upsert({
            channelId: message.channelId,
            telegramMsgId: message.telegramMsgId,
            rawText: message.rawText,
            senderId: message.senderId ?? null,
            isJobPost: parsed.isJobPost,
            messageDate: message.messageDate,
        });
        if (!parsed.isJobPost) {
            return { status: 'IGNORED' };
        }
        const duplicate = await job_repository_1.jobRepository.findByHash(message.userId, parsed.contentHash);
        if (duplicate) {
            await log_service_1.logService.info(client_2.LogCategory.SYSTEM, 'Duplicate job ignored', {
                jobId: duplicate.id,
            });
            return { status: 'DUPLICATE', jobId: duplicate.id };
        }
        const job = await jobIngestion_repository_1.jobIngestionRepository.createJob({
            userId: message.userId,
            messageId: stored.id,
            title: parsed.title,
            company: parsed.company,
            contactEmail: parsed.email,
            contactPhone: parsed.phone,
            experience: parsed.experience,
            salary: parsed.salary,
            remoteType: parsed.remoteType,
            deadline: parsed.deadline,
            description: parsed.description,
            rawText: message.rawText,
            contentHash: parsed.contentHash,
            skills: parsed.skills,
            locations: parsed.locations,
        });
        const profile = await profile_repository_1.profileRepository.findByUserId(message.userId);
        const settings = await settings_repository_1.settingsRepository.ensure(message.userId);
        if (!profile) {
            await log_service_1.logService.warn(client_2.LogCategory.SYSTEM, 'No profile for matching', {
                userId: message.userId,
            });
            return { status: 'SKIPPED', jobId: job.id };
        }
        const analysis = await matching_service_1.matchingService.analyze(job, profile, parsed.skills);
        await jobIngestion_repository_1.jobIngestionRepository.saveMatch(job.id, message.userId, analysis);
        await job_repository_1.jobRepository.updateStatus(job.id, client_1.JobStatus.MATCHED);
        if (analysis.score >= HIGH_SCORE_THRESHOLD) {
            await notification_service_1.notificationService.create({
                userId: message.userId,
                type: client_1.NotificationType.HIGH_SCORE_JOB,
                title: 'New high-score job',
                message: `${job.title} scored ${analysis.score}`,
                metadata: { jobId: job.id, score: analysis.score },
            });
        }
        const existingApplication = await application_repository_1.applicationRepository.findByUserAndJob(message.userId, job.id);
        const decision = (0, decisionRules_1.decideApplicationAction)({
            score: analysis.score,
            contactEmail: parsed.email,
            isDuplicateApplication: Boolean(existingApplication),
            profile,
            settings,
        });
        if (decision.action === 'SKIP') {
            await job_repository_1.jobRepository.updateStatus(job.id, client_1.JobStatus.SKIPPED);
            await log_service_1.logService.info(client_2.LogCategory.SYSTEM, 'Job skipped', {
                jobId: job.id,
                reason: decision.reason,
            });
            return { status: 'SKIPPED', jobId: job.id, score: analysis.score };
        }
        const email = await emailGeneration_service_1.emailGenerationService.generate(job, profile);
        const draft = await draft_repository_1.draftRepository.create({
            jobId: job.id,
            userId: message.userId,
            subject: email.subject,
            body: email.body,
            toEmail: parsed.email,
        });
        await job_repository_1.jobRepository.updateStatus(job.id, client_1.JobStatus.DRAFTED);
        if (decision.action === 'AUTO_APPLY') {
            const result = await application_service_1.applicationService.dispatch({
                userId: message.userId,
                jobId: job.id,
                toEmail: parsed.email,
                subject: email.subject,
                body: email.body,
                draftId: draft.id,
            });
            return {
                status: result.status === 'SENT' ? 'APPLIED' : 'SKIPPED',
                jobId: job.id,
                score: analysis.score,
            };
        }
        return { status: 'DRAFTED', jobId: job.id, score: analysis.score };
    },
};
const reprocessOpenJobs = async () => {
    const pending = await prisma_1.prisma.job.findMany({
        where: { status: client_1.JobStatus.DETECTED },
        select: { id: true },
    });
    await log_service_1.logService.info(client_2.LogCategory.SYSTEM, 'Reprocessing detected jobs', {
        count: pending.length,
    });
};
exports.reprocessOpenJobs = reprocessOpenJobs;
//# sourceMappingURL=applicationEngine.js.map