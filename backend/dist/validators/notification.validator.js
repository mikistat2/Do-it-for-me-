"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationIdSchema = exports.listNotificationsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listNotificationsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        isRead: zod_1.z
            .enum(['true', 'false'])
            .transform((value) => value === 'true')
            .optional(),
        type: zod_1.z.nativeEnum(client_1.NotificationType).optional(),
    }),
});
exports.notificationIdSchema = zod_1.z.object({ params: common_validator_1.idParam });
//# sourceMappingURL=notification.validator.js.map