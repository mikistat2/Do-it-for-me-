"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftRepository = void 0;
const prisma_1 = require("../database/prisma");
const draftInclude = {
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
exports.draftRepository = {
    create(data) {
        return prisma_1.prisma.applicationDraft.create({ data });
    },
    findById(userId, id) {
        return prisma_1.prisma.applicationDraft.findFirst({
            where: { id, userId },
            include: draftInclude,
        });
    },
    async list(filter, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.applicationDraft.findMany({
                where,
                include: draftInclude,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.applicationDraft.count({ where }),
        ]);
        return { items, total };
    },
    updateStatus(id, status) {
        return prisma_1.prisma.applicationDraft.update({ where: { id }, data: { status } });
    },
    update(id, data) {
        return prisma_1.prisma.applicationDraft.update({ where: { id }, data });
    },
};
//# sourceMappingURL=draft.repository.js.map