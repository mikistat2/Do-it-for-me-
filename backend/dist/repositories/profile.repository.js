"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRepository = void 0;
const prisma_1 = require("../database/prisma");
exports.profileRepository = {
    findByUserId(userId) {
        return prisma_1.prisma.profile.findUnique({ where: { userId } });
    },
    update(userId, data) {
        return prisma_1.prisma.profile.update({ where: { userId }, data });
    },
    upsert(userId, create, update) {
        return prisma_1.prisma.profile.upsert({
            where: { userId },
            create,
            update,
        });
    },
};
//# sourceMappingURL=profile.repository.js.map