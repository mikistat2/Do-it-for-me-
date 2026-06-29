"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.notificationController = {
    async list(req, res) {
        const userId = requireUserId(req);
        const query = req.query;
        const result = await notification_service_1.notificationService.list({ userId, isRead: query.isRead, type: query.type, search: query.search }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
    async unreadCount(req, res) {
        const count = await notification_service_1.notificationService.countUnread(requireUserId(req));
        (0, http_1.sendSuccess)(res, { count });
    },
    async markRead(req, res) {
        await notification_service_1.notificationService.markRead(requireUserId(req), req.params.id);
        (0, http_1.sendSuccess)(res, { message: 'Notification marked as read' });
    },
    async markAllRead(req, res) {
        const count = await notification_service_1.notificationService.markAllRead(requireUserId(req));
        (0, http_1.sendSuccess)(res, { count });
    },
};
//# sourceMappingURL=notification.controller.js.map