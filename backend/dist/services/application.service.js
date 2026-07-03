"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const client_1 = require("@prisma/client");
const application_repository_1 = require("../repositories/application.repository");
const draft_repository_1 = require("../repositories/draft.repository");
const job_repository_1 = require("../repositories/job.repository");
const email_service_1 = require("../email/email.service");
const mailer_1 = require("../email/mailer");
const notification_service_1 = require("./notification.service");
const log_service_1 = require("./log.service");
const pagination_1 = require("../utils/pagination");
const errors_1 = require("../utils/errors");
const decisionRules_1 = require("../jobs/decisionRules");
const profile_repository_1 = require("../repositories/profile.repository");
const emailGeneration_service_1 = require("../ai/emailGeneration.service");
const client_2 = require("@prisma/client");
exports.applicationService = {
    async list(filter, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await application_repository_1.applicationRepository.list(filter, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
    async get(userId, id) {
        const application = await application_repository_1.applicationRepository.findById(userId, id);
        if (!application) {
            throw new errors_1.NotFoundError('Application not found');
        }
        return application;
    },
    /**
     * Sends an application for a job, optionally tied to a draft. Prevents
     * duplicate applications and updates job/draft/application state plus
     * notifications and logs.
     */
    async dispatch(params) {
        if (!(0, mailer_1.isSmtpConfigured)()) {
            throw new errors_1.BadRequestError('SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in your .env file.');
        }
        if (!(0, decisionRules_1.isValidEmail)(params.toEmail)) {
            throw new errors_1.BadRequestError('A valid recipient email is required');
        }
        const existing = await application_repository_1.applicationRepository.findByUserAndJob(params.userId, params.jobId);
        if (existing && existing.status === client_1.ApplicationStatus.SENT) {
            throw new errors_1.ConflictError('This job has already been applied to');
        }
        const application = existing ??
            (await application_repository_1.applicationRepository.create({
                userId: params.userId,
                jobId: params.jobId,
                draftId: params.draftId ?? null,
                toEmail: params.toEmail,
                subject: params.subject,
                body: params.body,
                status: client_1.ApplicationStatus.SENDING,
            }));
        try {
            const { messageId } = await email_service_1.emailService.send({
                to: params.toEmail,
                subject: params.subject,
                body: params.body,
            });
            await application_repository_1.applicationRepository.markSent(application.id, messageId);
            await job_repository_1.jobRepository.updateStatus(params.jobId, client_1.JobStatus.APPLIED);
            if (params.draftId) {
                await draft_repository_1.draftRepository.updateStatus(params.draftId, client_1.DraftStatus.SENT);
            }
            await notification_service_1.notificationService.create({
                userId: params.userId,
                type: client_1.NotificationType.APPLICATION_SENT,
                title: 'Application sent',
                message: `Your application was sent to ${params.toEmail}`,
                metadata: { jobId: params.jobId, applicationId: application.id },
            });
            return { applicationId: application.id, status: client_1.ApplicationStatus.SENT };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await application_repository_1.applicationRepository.markFailed(application.id, message);
            await log_service_1.logService.error(client_2.LogCategory.EMAIL, 'Application dispatch failed', {
                jobId: params.jobId,
                error: message,
            });
            await notification_service_1.notificationService.create({
                userId: params.userId,
                type: client_1.NotificationType.APPLICATION_FAILED,
                title: 'Application failed',
                message: `Sending to ${params.toEmail} failed: ${message}`,
                metadata: { jobId: params.jobId, applicationId: application.id },
            });
            return { applicationId: application.id, status: client_1.ApplicationStatus.FAILED };
        }
    },
    async approveDraft(userId, draftId) {
        const draft = await draft_repository_1.draftRepository.findById(userId, draftId);
        if (!draft) {
            throw new errors_1.NotFoundError('Draft not found');
        }
        if (draft.status === client_1.DraftStatus.SENT) {
            throw new errors_1.ConflictError('This draft has already been sent');
        }
        await draft_repository_1.draftRepository.updateStatus(draftId, client_1.DraftStatus.APPROVED);
        return this.dispatch({
            userId,
            jobId: draft.jobId,
            toEmail: draft.toEmail,
            subject: draft.subject,
            body: draft.body,
            draftId: draft.id,
        });
    },
    /**
     * "Smart" send from a job ID only. Looks up the job's contact email,
     * fetches the user profile, generates email content via AI, then dispatches.
     */
    async sendFromJob(userId, jobId) {
        const job = await job_repository_1.jobRepository.findById(userId, jobId);
        if (!job) {
            throw new errors_1.NotFoundError('Job not found');
        }
        if (!(0, decisionRules_1.isValidEmail)(job.contactEmail)) {
            throw new errors_1.BadRequestError('This job has no valid contact email. Add one before sending.');
        }
        const profile = await profile_repository_1.profileRepository.findByUserId(userId);
        if (!profile) {
            throw new errors_1.BadRequestError('Complete your profile before sending applications.');
        }
        const email = await emailGeneration_service_1.emailGenerationService.generate(job, profile);
        return this.dispatch({
            userId,
            jobId,
            toEmail: job.contactEmail,
            subject: email.subject,
            body: email.body,
        });
    },
};
//# sourceMappingURL=application.service.js.map