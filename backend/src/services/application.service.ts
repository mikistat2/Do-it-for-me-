import {
  ApplicationStatus,
  DraftStatus,
  JobStatus,
  NotificationType,
} from '@prisma/client';
import {
  applicationRepository,
  ApplicationFilter,
} from '../repositories/application.repository';
import { draftRepository } from '../repositories/draft.repository';
import { jobRepository } from '../repositories/job.repository';
import { emailService } from '../email/email.service';
import { isSmtpConfigured } from '../email/mailer';
import { notificationService } from './notification.service';
import { logService } from './log.service';
import { buildPaginatedResult, resolvePagination } from '../utils/pagination';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { isValidEmail } from '../jobs/decisionRules';
import { profileRepository } from '../repositories/profile.repository';
import { emailGenerationService } from '../ai/emailGeneration.service';
import { LogCategory } from '@prisma/client';

export interface DispatchResult {
  applicationId: string;
  status: ApplicationStatus;
}

export const applicationService = {
  async list(filter: ApplicationFilter, page: number, pageSize: number) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await applicationRepository.list(filter, pagination);
    return buildPaginatedResult(items, total, pagination);
  },

  async get(userId: string, id: string) {
    const application = await applicationRepository.findById(userId, id);
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    return application;
  },

  /**
   * Sends an application for a job, optionally tied to a draft. Prevents
   * duplicate applications and updates job/draft/application state plus
   * notifications and logs.
   */
  async dispatch(params: {
    userId: string;
    jobId: string;
    toEmail: string;
    subject: string;
    body: string;
    draftId?: string | null;
  }): Promise<DispatchResult> {
    if (!isSmtpConfigured()) {
      throw new BadRequestError(
        'SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in your .env file.',
      );
    }
    if (!isValidEmail(params.toEmail)) {
      throw new BadRequestError('A valid recipient email is required');
    }

    const existing = await applicationRepository.findByUserAndJob(
      params.userId,
      params.jobId,
    );
    if (existing && existing.status === ApplicationStatus.SENT) {
      throw new ConflictError('This job has already been applied to');
    }

    const application =
      existing ??
      (await applicationRepository.create({
        userId: params.userId,
        jobId: params.jobId,
        draftId: params.draftId ?? null,
        toEmail: params.toEmail,
        subject: params.subject,
        body: params.body,
        status: ApplicationStatus.SENDING,
      }));

    try {
      const { messageId } = await emailService.send({
        to: params.toEmail,
        subject: params.subject,
        body: params.body,
      });
      await applicationRepository.markSent(application.id, messageId);
      await jobRepository.updateStatus(params.jobId, JobStatus.APPLIED);
      if (params.draftId) {
        await draftRepository.updateStatus(params.draftId, DraftStatus.SENT);
      }
      await notificationService.create({
        userId: params.userId,
        type: NotificationType.APPLICATION_SENT,
        title: 'Application sent',
        message: `Your application was sent to ${params.toEmail}`,
        metadata: { jobId: params.jobId, applicationId: application.id },
      });
      return { applicationId: application.id, status: ApplicationStatus.SENT };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await applicationRepository.markFailed(application.id, message);
      await logService.error(LogCategory.EMAIL, 'Application dispatch failed', {
        jobId: params.jobId,
        error: message,
      });
      await notificationService.create({
        userId: params.userId,
        type: NotificationType.APPLICATION_FAILED,
        title: 'Application failed',
        message: `Sending to ${params.toEmail} failed: ${message}`,
        metadata: { jobId: params.jobId, applicationId: application.id },
      });
      return { applicationId: application.id, status: ApplicationStatus.FAILED };
    }
  },

  async approveDraft(userId: string, draftId: string): Promise<DispatchResult> {
    const draft = await draftRepository.findById(userId, draftId);
    if (!draft) {
      throw new NotFoundError('Draft not found');
    }
    if (draft.status === DraftStatus.SENT) {
      throw new ConflictError('This draft has already been sent');
    }
    await draftRepository.updateStatus(draftId, DraftStatus.APPROVED);
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
  async sendFromJob(userId: string, jobId: string): Promise<DispatchResult> {
    const job = await jobRepository.findById(userId, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    if (!isValidEmail(job.contactEmail)) {
      throw new BadRequestError(
        'This job has no valid contact email. Add one before sending.',
      );
    }
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) {
      throw new BadRequestError(
        'Complete your profile before sending applications.',
      );
    }
    const email = await emailGenerationService.generate(job, profile);
    return this.dispatch({
      userId,
      jobId,
      toEmail: job.contactEmail,
      subject: email.subject,
      body: email.body,
    });
  },
};
