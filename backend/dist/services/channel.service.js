"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelService = void 0;
const channel_repository_1 = require("../repositories/channel.repository");
const pagination_1 = require("../utils/pagination");
const errors_1 = require("../utils/errors");
const telegramClient_1 = require("../telegram/telegramClient");
const telegram_1 = require("../telegram");
const logger_1 = require("../utils/logger");
exports.channelService = {
    async list(filter, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await channel_repository_1.channelRepository.list(filter, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
    async create(userId, input) {
        let finalChannelId = input.channelId;
        let username = input.username;
        try {
            const client = await (0, telegramClient_1.getTelegramClient)();
            if (client && client.connected) {
                let entity = await client.getEntity(input.channelId);
                // Handle invite links
                if (entity && 'chat' in entity && entity.chat) {
                    entity = entity.chat;
                }
                if (entity && entity.id) {
                    finalChannelId = entity.id.toString();
                    if ('username' in entity && entity.username) {
                        username = entity.username;
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.warn({ error, channelId: input.channelId }, 'Failed to resolve Telegram entity for channelId');
        }
        const channel = await channel_repository_1.channelRepository.create({
            userId,
            channelId: finalChannelId,
            title: input.title,
            username: username ?? null,
        });
        // Kick off background history fetch so existing messages are processed
        (0, telegram_1.fetchChannelHistory)(channel.id, userId, input.channelId, 100).catch((error) => {
            logger_1.logger.error({ error, channelId: channel.id }, 'Background history fetch failed');
        });
        return channel;
    },
    async get(userId, id) {
        const channel = await channel_repository_1.channelRepository.findById(userId, id);
        if (!channel) {
            throw new errors_1.NotFoundError('Channel not found');
        }
        return channel;
    },
    async update(userId, id, input) {
        await this.get(userId, id);
        return channel_repository_1.channelRepository.update(id, input);
    },
    async remove(userId, id) {
        await this.get(userId, id);
        await channel_repository_1.channelRepository.delete(id);
    },
    async setStatus(userId, id, status) {
        await this.get(userId, id);
        return channel_repository_1.channelRepository.update(id, { status });
    },
    /**
     * Manually sync a channel's history. Resolves the Telegram entity from
     * the stored channelId or username and fetches the last `limit` messages.
     */
    async syncHistory(userId, channelDbId, limit = 100) {
        const channel = await this.get(userId, channelDbId);
        const telegramEntity = channel.username
            ? channel.username
            : channel.channelId;
        return (0, telegram_1.fetchChannelHistory)(channelDbId, userId, telegramEntity, limit);
    },
};
//# sourceMappingURL=channel.service.js.map