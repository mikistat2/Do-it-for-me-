import {
  ApplicationStatus,
  DraftStatus,
  JobStatus,
} from '@prisma/client';
import { prisma } from '../database/prisma';

export interface DashboardSummary {
  totals: {
    jobs: number;
    matchedJobs: number;
    drafts: number;
    pendingDrafts: number;
    applications: number;
    applicationsSent: number;
    applicationsFailed: number;
    channels: number;
    unreadNotifications: number;
  };
  successRate: number;
  averageMatchScore: number;
}

const toPercent = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);

export const statisticsService = {
  async summary(userId: string): Promise<DashboardSummary> {
    const [
      jobs,
      matchedJobs,
      drafts,
      pendingDrafts,
      applications,
      applicationsSent,
      applicationsFailed,
      channels,
      unreadNotifications,
      matchAggregate,
    ] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.count({ where: { userId, match: { isNot: null } } }),
      prisma.applicationDraft.count({ where: { userId } }),
      prisma.applicationDraft.count({
        where: { userId, status: DraftStatus.PENDING },
      }),
      prisma.application.count({ where: { userId } }),
      prisma.application.count({
        where: { userId, status: ApplicationStatus.SENT },
      }),
      prisma.application.count({
        where: { userId, status: ApplicationStatus.FAILED },
      }),
      prisma.telegramChannel.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.jobMatch.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
    ]);

    return {
      totals: {
        jobs,
        matchedJobs,
        drafts,
        pendingDrafts,
        applications,
        applicationsSent,
        applicationsFailed,
        channels,
        unreadNotifications,
      },
      successRate: toPercent(applicationsSent, applications),
      averageMatchScore: Math.round(matchAggregate._avg.score ?? 0),
    };
  },

  async jobsByStatus(userId: string) {
    const grouped = await prisma.job.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const result: Record<string, number> = {};
    for (const status of Object.values(JobStatus)) {
      result[status] = 0;
    }
    for (const row of grouped) {
      result[row.status] = row._count._all;
    }
    return result;
  },

  async applicationsTrend(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const applications = await prisma.application.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    });

    const buckets = new Map<string, { sent: number; failed: number; total: number }>();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      buckets.set(date.toISOString().slice(0, 10), { sent: 0, failed: 0, total: 0 });
    }

    for (const application of applications) {
      const key = application.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) {
        continue;
      }
      bucket.total += 1;
      if (application.status === ApplicationStatus.SENT) {
        bucket.sent += 1;
      } else if (application.status === ApplicationStatus.FAILED) {
        bucket.failed += 1;
      }
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      ...value,
    }));
  },

  recentApplications(userId: string, limit = 5) {
    return prisma.application.findMany({
      where: { userId },
      include: { job: { include: { match: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  pendingDrafts(userId: string, limit = 5) {
    return prisma.applicationDraft.findMany({
      where: { userId, status: DraftStatus.PENDING },
      include: { job: { include: { match: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
