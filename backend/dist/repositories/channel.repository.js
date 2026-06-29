"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../database/prisma");
const buildWhere = (filter) => {
    const where = { userId: filter.userId };
    if (filter.status) {
        where.status = filter.status;
    }
    if (filter.search) {
        where.OR = [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { username: { contains: filter.search, mode: 'insensitive' } },
        ];
    }
    return where;
};
exports.channelRepository = {
    create(data) {
        return prisma_1.prisma.telegramChannel.create({ data });
    },
    findById(userId, id) {
        return prisma_1.prisma.telegramChannel.findFirst({ where: { id, userId } });
    },
    findActiveForUser(userId) {
        return prisma_1.prisma.telegramChannel.findMany({
            where: { userId, status: client_1.ChannelStatus.ACTIVE },
        });
    },
    async list(filter, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.telegramChannel.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.telegramChannel.count({ where }),
        ]);
        return { items, total };
    },
    update(id, data) {
        return prisma_1.prisma.telegramChannel.update({ where: { id }, data });
    },
    delete(id) {
        return prisma_1.prisma.telegramChannel.delete({ where: { id } });
    },
};
//# sourceMappingURL=channel.repository.js.map