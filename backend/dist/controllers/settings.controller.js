"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = void 0;
const settings_service_1 = require("../services/settings.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.settingsController = {
    async get(req, res) {
        const settings = await settings_service_1.settingsService.get(requireUserId(req));
        (0, http_1.sendSuccess)(res, settings);
    },
    async update(req, res) {
        const settings = await settings_service_1.settingsService.update(requireUserId(req), req.body);
        (0, http_1.sendSuccess)(res, settings);
    },
    async pause(req, res) {
        const settings = await settings_service_1.settingsService.setPaused(requireUserId(req), true);
        (0, http_1.sendSuccess)(res, settings);
    },
    async resume(req, res) {
        const settings = await settings_service_1.settingsService.setPaused(requireUserId(req), false);
        (0, http_1.sendSuccess)(res, settings);
    },
};
//# sourceMappingURL=settings.controller.js.map