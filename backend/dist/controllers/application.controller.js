"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationController = void 0;
const application_service_1 = require("../services/application.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.applicationController = {
    async list(req, res) {
        const userId = requireUserId(req);
        const query = req.query;
        const result = await application_service_1.applicationService.list({ userId, status: query.status, search: query.search }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
    async get(req, res) {
        const application = await application_service_1.applicationService.get(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, application);
    },
    async manualSend(req, res) {
        const userId = requireUserId(req);
        const result = await application_service_1.applicationService.dispatch({
            userId,
            jobId: req.body.jobId,
            toEmail: req.body.toEmail,
            subject: req.body.subject,
            body: req.body.body,
        });
        (0, http_1.sendCreated)(res, result);
    },
    async approveDraft(req, res) {
        const userId = requireUserId(req);
        const result = await application_service_1.applicationService.approveDraft(userId, req.params.id);
        (0, http_1.sendCreated)(res, result);
    },
};
//# sourceMappingURL=application.controller.js.map