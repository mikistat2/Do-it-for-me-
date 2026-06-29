"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRepository = void 0;
const prisma_1 = require("../database/prisma");
const buildWhere = (filter) => {
    const where = {};
    if (filter.level) {
        where.level = filter.level;
    }
    if (filter.category) {
        where.category = filter.category;
    }
    if (filter.search) {
        where.message = { contains: filter.search, mode: 'insensitive' };
    }
    return where;
};
exports.logRepository = {
    create(data) {
        return prisma_1.prisma.log.create({ data });
    },
    async list(filter, pagination) {
        const where = buildWhere(filter);
        const [items, total] = await Promise.all([
            prisma_1.prisma.log.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma_1.prisma.log.count({ where }),
        ]);
        return { items, total };
    },
};
//# sourceMappingURL=log.repository.js.map