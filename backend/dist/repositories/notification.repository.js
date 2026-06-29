"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const prisma_1 = require("../database/prisma");
const buildWhere = (filter) => {
    const where = { userId: filter.userId };
    if (typeof filter.isRead === 'boolean') {
        where.isRead = filter.isRead;
    }
    if (filter.type) {
        where.type = filter.type;
    }
    if (filter.search) {
        where.OR = [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { message: { contains: filter.search, mode: 'insensitive' } },
        ];
    }
    return where;
};
exports.notificationRepository = {
    create(data) {
        return prisma_1.prisma.notification.create({ data });
    },
    async list(filter, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.notification.count({ where }),
        ]);
        return { items, total };
    },
    countUnread(userId) {
        return prisma_1.prisma.notification.count({ where: { userId, isRead: false } });
    },
    markRead(userId, id) {
        return prisma_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    },
    markAllRead(userId) {
        return prisma_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    },
};
//# sourceMappingURL=notification.repository.js.map