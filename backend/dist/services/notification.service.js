"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const client_1 = require("@prisma/client");
const notification_repository_1 = require("../repositories/notification.repository");
const settings_repository_1 = require("../repositories/settings.repository");
const pagination_1 = require("../utils/pagination");
const errors_1 = require("../utils/errors");
exports.notificationService = {
    async create(input) {
        const settings = await settings_repository_1.settingsRepository.findByUserId(input.userId);
        if (settings) {
            if (input.type === client_1.NotificationType.HIGH_SCORE_JOB && !settings.notifyOnHighScore) {
                return null;
            }
            if (input.type === client_1.NotificationType.APPLICATION_SENT && !settings.notifyOnSent) {
                return null;
            }
            if (input.type === client_1.NotificationType.APPLICATION_FAILED && !settings.notifyOnFailed) {
                return null;
            }
        }
        return notification_repository_1.notificationRepository.create({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            metadata: input.metadata,
        });
    },
    async list(filter, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await notification_repository_1.notificationRepository.list(filter, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
    countUnread(userId) {
        return notification_repository_1.notificationRepository.countUnread(userId);
    },
    async markRead(userId, id) {
        const result = await notification_repository_1.notificationRepository.markRead(userId, id);
        if (result.count === 0) {
            throw new errors_1.NotFoundError('Notification not found');
        }
    },
    async markAllRead(userId) {
        const result = await notification_repository_1.notificationRepository.markAllRead(userId);
        return result.count;
    },
};
//# sourceMappingURL=notification.service.js.map