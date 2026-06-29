"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectTelegram = exports.getExistingClient = exports.getTelegramClient = exports.isTelegramConfigured = void 0;
const telegram_1 = require("telegram");
const sessions_1 = require("telegram/sessions");
const config_1 = require("../config");
const session_1 = require("./session");
const logger_1 = require("../utils/logger");
let client = null;
const isTelegramConfigured = () => Boolean(config_1.config.telegram.apiId && config_1.config.telegram.apiHash);
exports.isTelegramConfigured = isTelegramConfigured;
/**
 * Returns a connected TelegramClient singleton. The client is created lazily
 * from the persisted string session and configured with automatic reconnects.
 */
const getTelegramClient = async () => {
    if (client && client.connected) {
        return client;
    }
    if (!(0, exports.isTelegramConfigured)()) {
        throw new Error('Telegram API credentials are not configured');
    }
    const session = new sessions_1.StringSession((0, session_1.loadSession)());
    client = new telegram_1.TelegramClient(session, config_1.config.telegram.apiId, config_1.config.telegram.apiHash, {
        connectionRetries: 10,
        retryDelay: 2000,
        autoReconnect: true,
        maxConcurrentDownloads: 1,
    });
    await client.connect();
    const saved = client.session.save();
    if (typeof saved === 'string' && saved.length > 0) {
        (0, session_1.saveSession)(saved);
    }
    logger_1.logger.info('Telegram client connected');
    return client;
};
exports.getTelegramClient = getTelegramClient;
const getExistingClient = () => client;
exports.getExistingClient = getExistingClient;
const disconnectTelegram = async () => {
    if (client) {
        await client.disconnect();
        client = null;
        logger_1.logger.info('Telegram client disconnected');
    }
};
exports.disconnectTelegram = disconnectTelegram;
//# sourceMappingURL=telegramClient.js.map