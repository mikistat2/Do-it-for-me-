"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchChannelHistory = exports.stopTelegramMonitor = exports.startTelegramMonitor = void 0;
const telegram_1 = require("telegram");
const events_1 = require("telegram/events");
const telegramClient_1 = require("./telegramClient");
const channel_repository_1 = require("../repositories/channel.repository");
const prisma_1 = require("../database/prisma");
const applicationEngine_1 = require("../jobs/applicationEngine");
const log_service_1 = require("../services/log.service");
const logger_1 = require("../utils/logger");
const client_1 = require("@prisma/client");
const RECONNECT_CHECK_INTERVAL_MS = 30000;
let running = false;
let reconnectTimer = null;
let handler = null;
const resolveChatId = (event) => {
    const message = event.message;
    const peer = message.peerId;
    if (peer instanceof telegram_1.Api.PeerChannel) {
        return peer.channelId.toString();
    }
    if (peer instanceof telegram_1.Api.PeerChat) {
        return peer.chatId.toString();
    }
    if (message.chatId) {
        return message.chatId.toString();
    }
    return null;
};
const buildHandler = () => async (event) => {
    try {
        const text = event.message?.message;
        if (!text) {
            return;
        }
        const chatId = resolveChatId(event);
        if (!chatId) {
            return;
        }
        const channels = await prisma_1.prisma.telegramChannel.findMany({
            where: { channelId: chatId, status: 'ACTIVE' },
        });
        if (channels.length === 0) {
            return;
        }
        await log_service_1.logService.info(client_1.LogCategory.TELEGRAM, 'Message received', {
            chatId,
            messageId: event.message.id,
        });
        for (const channel of channels) {
            const result = await applicationEngine_1.applicationEngine.processMessage({
                userId: channel.userId,
                channelId: channel.id,
                telegramMsgId: String(event.message.id),
                rawText: text,
                senderId: event.message.senderId?.toString() ?? null,
                messageDate: new Date(event.message.date * 1000),
            });
            if (result.status !== 'IGNORED') {
                await channel_repository_1.channelRepository.update(channel.id, { lastMessageAt: new Date() });
            }
        }
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to process Telegram message');
        await log_service_1.logService.error(client_1.LogCategory.TELEGRAM, 'Message processing failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
const ensureConnection = async () => {
    const existing = (0, telegramClient_1.getExistingClient)();
    if (existing && existing.connected) {
        return;
    }
    try {
        const client = await (0, telegramClient_1.getTelegramClient)();
        if (handler) {
            client.addEventHandler(handler, new events_1.NewMessage({}));
        }
        await log_service_1.logService.info(client_1.LogCategory.TELEGRAM, 'Telegram connection (re)established');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Telegram reconnect attempt failed');
    }
};
const startTelegramMonitor = async () => {
    if (!(0, telegramClient_1.isTelegramConfigured)()) {
        logger_1.logger.warn('Telegram is not configured; monitor not started');
        return;
    }
    if (running) {
        return;
    }
    running = true;
    handler = buildHandler();
    const client = await (0, telegramClient_1.getTelegramClient)();
    client.addEventHandler(handler, new events_1.NewMessage({}));
    await log_service_1.logService.info(client_1.LogCategory.TELEGRAM, 'Telegram monitor started');
    reconnectTimer = setInterval(() => {
        void ensureConnection();
    }, RECONNECT_CHECK_INTERVAL_MS);
};
exports.startTelegramMonitor = startTelegramMonitor;
const stopTelegramMonitor = async () => {
    running = false;
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
    }
    handler = null;
    await log_service_1.logService.warn(client_1.LogCategory.SYSTEM, 'Telegram monitor stopped');
};
exports.stopTelegramMonitor = stopTelegramMonitor;
/**
 * Fetches the last `limit` messages from a Telegram channel/group and
 * processes each one through the applicationEngine pipeline. This is used
 * both when a new channel is added (auto-fetch) and for manual sync.
 */
const fetchChannelHistory = async (channelDbId, userId, telegramEntity, limit = 100) => {
    if (!(0, telegramClient_1.isTelegramConfigured)()) {
        throw new Error('Telegram is not configured');
    }
    const client = await (0, telegramClient_1.getTelegramClient)();
    let entity;
    try {
        entity = await client.getEntity(telegramEntity);
    }
    catch (error) {
        if (/^\d+$/.test(telegramEntity)) {
            try {
                entity = await client.getEntity(`-100${telegramEntity}`);
            }
            catch (error2) {
                try {
                    entity = await client.getEntity(`-${telegramEntity}`);
                }
                catch (error3) {
                    logger_1.logger.error({ error: error3, telegramEntity }, 'Failed to resolve Telegram entity for history fetch');
                    throw new Error(`Cannot resolve Telegram entity: ${telegramEntity}`);
                }
            }
        }
        else {
            logger_1.logger.error({ error, telegramEntity }, 'Failed to resolve Telegram entity for history fetch');
            throw new Error(`Cannot resolve Telegram entity: ${telegramEntity}`);
        }
    }
    const messages = await client.getMessages(entity, { limit });
    await log_service_1.logService.info(client_1.LogCategory.TELEGRAM, 'Fetching channel history', {
        channelDbId,
        telegramEntity,
        messageCount: messages.length,
    });
    let processed = 0;
    let jobs = 0;
    for (const msg of messages) {
        const text = msg.message;
        if (!text || text.trim().length === 0) {
            continue;
        }
        try {
            const result = await applicationEngine_1.applicationEngine.processMessage({
                userId,
                channelId: channelDbId,
                telegramMsgId: String(msg.id),
                rawText: text,
                senderId: msg.senderId?.toString() ?? null,
                messageDate: new Date(msg.date * 1000),
            });
            processed++;
            if (result.status !== 'IGNORED' && result.status !== 'DUPLICATE') {
                jobs++;
                await channel_repository_1.channelRepository.update(channelDbId, { lastMessageAt: new Date() });
            }
        }
        catch (error) {
            logger_1.logger.error({ error, messageId: msg.id }, 'Failed to process historical message');
        }
    }
    await log_service_1.logService.info(client_1.LogCategory.TELEGRAM, 'Channel history fetch complete', {
        channelDbId,
        processed,
        jobs,
    });
    return { processed, jobs };
};
exports.fetchChannelHistory = fetchChannelHistory;
//# sourceMappingURL=telegramMonitor.js.map