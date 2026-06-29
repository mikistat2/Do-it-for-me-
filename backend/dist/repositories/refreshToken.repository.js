"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenRepository = void 0;
const prisma_1 = require("../database/prisma");
exports.refreshTokenRepository = {
    create(data) {
        return prisma_1.prisma.refreshToken.create({ data });
    },
    findByHash(tokenHash) {
        return prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash } });
    },
    revokeByHash(tokenHash) {
        return prisma_1.prisma.refreshToken
            .updateMany({ where: { tokenHash }, data: { revoked: true } })
            .then((result) => result.count);
    },
    revokeAllForUser(userId) {
        return prisma_1.prisma.refreshToken
            .updateMany({ where: { userId, revoked: false }, data: { revoked: true } })
            .then((result) => result.count);
    },
    deleteExpired() {
        return prisma_1.prisma.refreshToken
            .deleteMany({ where: { expiresAt: { lt: new Date() } } })
            .then((result) => result.count);
    },
};
//# sourceMappingURL=refreshToken.repository.js.map