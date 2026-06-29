"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramMessageRepository = void 0;
const prisma_1 = require("../database/prisma");
exports.telegramMessageRepository = {
    upsert(data) {
        return prisma_1.prisma.telegramMessage.upsert({
            where: {
                channelId_telegramMsgId: {
                    channelId: data.channelId,
                    telegramMsgId: data.telegramMsgId,
                },
            },
            create: data,
            update: {
                rawText: data.rawText,
                isJobPost: data.isJobPost,
                senderId: data.senderId ?? undefined,
            },
        });
    },
    exists(channelId, telegramMsgId) {
        return prisma_1.prisma.telegramMessage
            .count({ where: { channelId, telegramMsgId } })
            .then((count) => count > 0);
    },
};
//# sourceMappingURL=telegramMessage.repository.js.map