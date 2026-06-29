"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../database/prisma");
const toPercent = (numerator, denominator) => denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
exports.statisticsService = {
    async summary(userId) {
        const [jobs, matchedJobs, drafts, pendingDrafts, applications, applicationsSent, applicationsFailed, channels, unreadNotifications, matchAggregate,] = await Promise.all([
            prisma_1.prisma.job.count({ where: { userId } }),
            prisma_1.prisma.job.count({ where: { userId, match: { isNot: null } } }),
            prisma_1.prisma.applicationDraft.count({ where: { userId } }),
            prisma_1.prisma.applicationDraft.count({
                where: { userId, status: client_1.DraftStatus.PENDING },
            }),
            prisma_1.prisma.application.count({ where: { userId } }),
            prisma_1.prisma.application.count({
                where: { userId, status: client_1.ApplicationStatus.SENT },
            }),
            prisma_1.prisma.application.count({
                where: { userId, status: client_1.ApplicationStatus.FAILED },
            }),
            prisma_1.prisma.telegramChannel.count({ where: { userId } }),
            prisma_1.prisma.notification.count({ where: { userId, isRead: false } }),
            prisma_1.prisma.jobMatch.aggregate({
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
    async jobsByStatus(userId) {
        const grouped = await prisma_1.prisma.job.groupBy({
            by: ['status'],
            where: { userId },
            _count: { _all: true },
        });
        const result = {};
        for (const status of Object.values(client_1.JobStatus)) {
            result[status] = 0;
        }
        for (const row of grouped) {
            result[row.status] = row._count._all;
        }
        return result;
    },
    async applicationsTrend(userId, days = 14) {
        const since = new Date();
        since.setDate(since.getDate() - (days - 1));
        since.setHours(0, 0, 0, 0);
        const applications = await prisma_1.prisma.application.findMany({
            where: { userId, createdAt: { gte: since } },
            select: { createdAt: true, status: true },
        });
        const buckets = new Map();
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
            if (application.status === client_1.ApplicationStatus.SENT) {
                bucket.sent += 1;
            }
            else if (application.status === client_1.ApplicationStatus.FAILED) {
                bucket.failed += 1;
            }
        }
        return Array.from(buckets.entries()).map(([date, value]) => ({
            date,
            ...value,
        }));
    },
    recentApplications(userId, limit = 5) {
        return prisma_1.prisma.application.findMany({
            where: { userId },
            include: { job: { include: { match: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    },
    pendingDrafts(userId, limit = 5) {
        return prisma_1.prisma.applicationDraft.findMany({
            where: { userId, status: client_1.DraftStatus.PENDING },
            include: { job: { include: { match: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    },
};
//# sourceMappingURL=statistics.service.js.map