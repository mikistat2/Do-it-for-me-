"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobController = void 0;
const job_service_1 = require("../services/job.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.jobController = {
    async list(req, res) {
        const userId = requireUserId(req);
        const query = req.query;
        const result = await job_service_1.jobService.list({
            userId,
            status: query.status,
            remoteType: query.remoteType,
            company: query.company,
            minScore: query.minScore,
            search: query.search,
        }, { sortBy: query.sortBy ?? 'createdAt', sortOrder: query.sortOrder }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
    async get(req, res) {
        const job = await job_service_1.jobService.get(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, job);
    },
    async archive(req, res) {
        await job_service_1.jobService.archive(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, { message: 'Job archived' });
    },
};
//# sourceMappingURL=job.controller.js.map