"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftController = void 0;
const draft_service_1 = require("../services/draft.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.draftController = {
    async list(req, res) {
        const userId = requireUserId(req);
        const query = req.query;
        const result = await draft_service_1.draftService.list({ userId, status: query.status, search: query.search }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
    async get(req, res) {
        const draft = await draft_service_1.draftService.get(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, draft);
    },
    async update(req, res) {
        const draft = await draft_service_1.draftService.update(requireUserId(req), req.params.id, req.body);
        (0, http_1.sendSuccess)(res, draft);
    },
    async reject(req, res) {
        const draft = await draft_service_1.draftService.reject(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, draft);
    },
};
//# sourceMappingURL=draft.controller.js.map