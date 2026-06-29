"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRepository = void 0;
const prisma_1 = require("../database/prisma");
const SORTABLE_FIELDS = new Set(['createdAt', 'title', 'company', 'status']);
const jobInclude = {
    skills: true,
    locations: true,
    match: true,
    message: true,
};
const buildWhere = (filter) => {
    const where = { userId: filter.userId };
    if (filter.status) {
        where.status = filter.status;
    }
    if (filter.remoteType) {
        where.remoteType = filter.remoteType;
    }
    if (filter.company) {
        where.company = { contains: filter.company, mode: 'insensitive' };
    }
    if (typeof filter.minScore === 'number') {
        where.match = { score: { gte: filter.minScore } };
    }
    if (filter.search) {
        where.OR = [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { company: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
        ];
    }
    return where;
};
const buildOrderBy = (sort) => {
    const field = SORTABLE_FIELDS.has(sort.sortBy) ? sort.sortBy : 'createdAt';
    return { [field]: sort.sortOrder };
};
exports.jobRepository = {
    async list(filter, sort, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                include: jobInclude,
                orderBy: buildOrderBy(sort),
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.job.count({ where }),
        ]);
        return { items, total };
    },
    findById(userId, id) {
        return prisma_1.prisma.job.findFirst({
            where: { id, userId },
            include: jobInclude,
        });
    },
    findByHash(userId, contentHash) {
        return prisma_1.prisma.job.findUnique({
            where: { userId_contentHash: { userId, contentHash } },
            include: jobInclude,
        });
    },
    updateStatus(id, status) {
        return prisma_1.prisma.job.update({ where: { id }, data: { status } });
    },
};
//# sourceMappingURL=job.repository.js.map