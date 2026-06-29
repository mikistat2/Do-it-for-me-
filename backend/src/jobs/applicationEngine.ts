import { JobStatus, NotificationType } from '@prisma/client';
import { prisma } from '../database/prisma';
import { detectJob } from './jobDetector';
import { decideApplicationAction } from './decisionRules';
import { telegramMessageRepository } from '../repositories/telegramMessage.repository';
import { jobIngestionRepository } from '../repositories/jobIngestion.repository';
import { jobRepository } from '../repositories/job.repository';
import { draftRepository } from '../repositories/draft.repository';
import { applicationRepository } from '../repositories/application.repository';
import { profileRepository } from '../repositories/profile.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { matchingService } from '../ai/matching.service';
import { emailGenerationService } from '../ai/emailGeneration.service';
import { applicationService } from '../services/application.service';
import { notificationService } from '../services/notification.service';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

export interface IncomingMessage {
  userId: string;
  channelId: string;
  telegramMsgId: string;
  rawText: string;
  senderId?: string | null;
  messageDate: Date;
}

export interface ProcessingResult {
  status: 'IGNORED' | 'DUPLICATE' | 'DRAFTED' | 'APPLIED' | 'SKIPPED';
  jobId?: string;
  score?: number;
}

const HIGH_SCORE_THRESHOLD = 85;

export const applicationEngine = {
  async processMessage(message: IncomingMessage): Promise<ProcessingResult> {
    const parsed = detectJob(message.rawText);

    const stored = await telegramMessageRepository.upsert({
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

    const duplicate = await jobRepository.findByHash(
      message.userId,
      parsed.contentHash,
    );
    if (duplicate) {
      await logService.info(LogCategory.SYSTEM, 'Duplicate job ignored', {
        jobId: duplicate.id,
      });
      return { status: 'DUPLICATE', jobId: duplicate.id };
    }

    const job = await jobIngestionRepository.createJob({
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

    const profile = await profileRepository.findByUserId(message.userId);
    const settings = await settingsRepository.ensure(message.userId);
    if (!profile) {
      await logService.warn(LogCategory.SYSTEM, 'No profile for matching', {
        userId: message.userId,
      });
      return { status: 'SKIPPED', jobId: job.id };
    }

    const analysis = await matchingService.analyze(job, profile, parsed.skills);
    await jobIngestionRepository.saveMatch(job.id, message.userId, analysis);
    await jobRepository.updateStatus(job.id, JobStatus.MATCHED);

    if (analysis.score >= HIGH_SCORE_THRESHOLD) {
      await notificationService.create({
        userId: message.userId,
        type: NotificationType.HIGH_SCORE_JOB,
        title: 'New high-score job',
        message: `${job.title} scored ${analysis.score}`,
        metadata: { jobId: job.id, score: analysis.score },
      });
    }

    const existingApplication = await applicationRepository.findByUserAndJob(
      message.userId,
      job.id,
    );
    const decision = decideApplicationAction({
      score: analysis.score,
      contactEmail: parsed.email,
      isDuplicateApplication: Boolean(existingApplication),
      profile,
      settings,
    });

    if (decision.action === 'SKIP') {
      await jobRepository.updateStatus(job.id, JobStatus.SKIPPED);
      await logService.info(LogCategory.SYSTEM, 'Job skipped', {
        jobId: job.id,
        reason: decision.reason,
      });
      return { status: 'SKIPPED', jobId: job.id, score: analysis.score };
    }

    const email = await emailGenerationService.generate(job, profile);
    const draft = await draftRepository.create({
      jobId: job.id,
      userId: message.userId,
      subject: email.subject,
      body: email.body,
      toEmail: parsed.email as string,
    });
    await jobRepository.updateStatus(job.id, JobStatus.DRAFTED);

    if (decision.action === 'AUTO_APPLY') {
      const result = await applicationService.dispatch({
        userId: message.userId,
        jobId: job.id,
        toEmail: parsed.email as string,
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

export const reprocessOpenJobs = async (): Promise<void> => {
  const pending = await prisma.job.findMany({
    where: { status: JobStatus.DETECTED },
    select: { id: true },
  });
  await logService.info(LogCategory.SYSTEM, 'Reprocessing detected jobs', {
    count: pending.length,
  });
};
