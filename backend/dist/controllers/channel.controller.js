"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelController = void 0;
const channel_service_1 = require("../services/channel.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.channelController = {
    async list(req, res) {
        const userId = requireUserId(req);
        const query = req.query;
        const result = await channel_service_1.channelService.list({ userId, status: query.status, search: query.search }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
    async create(req, res) {
        const channel = await channel_service_1.channelService.create(requireUserId(req), req.body);
        (0, http_1.sendCreated)(res, channel);
    },
    async update(req, res) {
        const channel = await channel_service_1.channelService.update(requireUserId(req), req.params.id, req.body);
        (0, http_1.sendSuccess)(res, channel);
    },
    async remove(req, res) {
        await channel_service_1.channelService.remove(requireUserId(req), req.params.id);
        (0, http_1.sendNoContent)(res);
    },
    async sync(req, res) {
        const userId = requireUserId(req);
        const result = await channel_service_1.channelService.syncHistory(userId, req.params.id);
        (0, http_1.sendSuccess)(res, result);
    },
};
//# sourceMappingURL=channel.controller.js.map