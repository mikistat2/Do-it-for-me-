"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const prisma_1 = require("../database/prisma");
exports.userRepository = {
    findByEmail(email) {
        return prisma_1.prisma.user.findUnique({ where: { email } });
    },
    findById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id } });
    },
    create(data) {
        return prisma_1.prisma.user.create({ data });
    },
    update(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data });
    },
};
//# sourceMappingURL=user.repository.js.map