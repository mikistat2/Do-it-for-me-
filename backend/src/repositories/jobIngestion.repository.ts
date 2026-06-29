import { Job, JobStatus, MatchRecommendation, RemoteType } from '@prisma/client';
import { prisma } from '../database/prisma';

export interface CreateJobData {
  userId: string;
  messageId: string;
  title: string;
  company: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  experience: string | null;
  salary: string | null;
  remoteType: RemoteType;
  deadline: Date | null;
  description: string;
  rawText: string;
  contentHash: string;
  skills: string[];
  locations: string[];
}

export interface MatchData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  reason: string;
  recommendation: MatchRecommendation;
}

export const jobIngestionRepository = {
  createJob(data: CreateJobData): Promise<Job> {
    return prisma.job.create({
      data: {
        userId: data.userId,
        messageId: data.messageId,
        title: data.title,
        company: data.company,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        experience: data.experience,
        salary: data.salary,
        remoteType: data.remoteType,
        deadline: data.deadline,
        description: data.description,
        rawText: data.rawText,
        contentHash: data.contentHash,
        status: JobStatus.DETECTED,
        skills: {
          create: data.skills.map((name) => ({ name })),
        },
        locations: {
          create: data.locations.map((name) => ({ name })),
        },
      },
    });
  },

  saveMatch(jobId: string, userId: string, match: MatchData) {
    return prisma.jobMatch.upsert({
      where: { jobId },
      create: { jobId, userId, ...match },
      update: match,
    });
  },
};
