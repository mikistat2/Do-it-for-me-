"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationController = void 0;
const settings_service_1 = require("../services/settings.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const telegramClient_1 = require("../telegram/telegramClient");
const config_1 = require("../config");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.automationController = {
    async status(req, res) {
        const userId = requireUserId(req);
        const settings = await settings_service_1.settingsService.get(userId);
        const automationStatus = {
            automationPaused: settings.automationPaused,
            autoApply: settings.autoApply,
            matchThreshold: settings.matchThreshold,
            telegramConfigured: (0, telegramClient_1.isTelegramConfigured)(),
            hfConfigured: Boolean(config_1.config.hf.token),
        };
        (0, http_1.sendSuccess)(res, automationStatus);
    },
    async pause(req, res) {
        const userId = requireUserId(req);
        await settings_service_1.settingsService.update(userId, { automationPaused: true });
        (0, http_1.sendSuccess)(res, { message: 'Automation paused' });
    },
    async resume(req, res) {
        const userId = requireUserId(req);
        await settings_service_1.settingsService.update(userId, { automationPaused: false });
        (0, http_1.sendSuccess)(res, { message: 'Automation resumed' });
    },
};
//# sourceMappingURL=automation.controller.js.map