"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRepository = void 0;
const prisma_1 = require("../database/prisma");
const config_1 = require("../config");
exports.settingsRepository = {
    findByUserId(userId) {
        return prisma_1.prisma.setting.findUnique({ where: { userId } });
    },
    ensure(userId) {
        return prisma_1.prisma.setting.upsert({
            where: { userId },
            create: {
                userId,
                matchThreshold: config_1.config.automation.defaultMatchThreshold,
                autoApply: config_1.config.automation.autoApplyEnabled,
            },
            update: {},
        });
    },
    update(userId, data) {
        return prisma_1.prisma.setting.update({ where: { userId }, data });
    },
};
//# sourceMappingURL=settings.repository.js.map