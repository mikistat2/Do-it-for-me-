"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../database/prisma");
const applicationInclude = {
    job: { include: { match: true } },
};
const buildWhere = (filter) => {
    const where = { userId: filter.userId };
    if (filter.status) {
        where.status = filter.status;
    }
    if (filter.search) {
        where.OR = [
            { subject: { contains: filter.search, mode: 'insensitive' } },
            { toEmail: { contains: filter.search, mode: 'insensitive' } },
            { job: { title: { contains: filter.search, mode: 'insensitive' } } },
        ];
    }
    return where;
};
exports.applicationRepository = {
    findByUserAndJob(userId, jobId) {
        return prisma_1.prisma.application.findUnique({
            where: { userId_jobId: { userId, jobId } },
        });
    },
    create(data) {
        return prisma_1.prisma.application.create({ data });
    },
    findById(userId, id) {
        return prisma_1.prisma.application.findFirst({
            where: { id, userId },
            include: applicationInclude,
        });
    },
    async list(filter, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.application.findMany({
                where,
                include: applicationInclude,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.application.count({ where }),
        ]);
        return { items, total };
    },
    markSent(id, messageId) {
        return prisma_1.prisma.application.update({
            where: { id },
            data: {
                status: client_1.ApplicationStatus.SENT,
                messageId,
                sentAt: new Date(),
                attempts: { increment: 1 },
                error: null,
            },
        });
    },
    markFailed(id, error) {
        return prisma_1.prisma.application.update({
            where: { id },
            data: {
                status: client_1.ApplicationStatus.FAILED,
                attempts: { increment: 1 },
                error,
            },
        });
    },
};
//# sourceMappingURL=application.repository.js.map