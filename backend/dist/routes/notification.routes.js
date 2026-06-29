"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const notification_validator_1 = require("../validators/notification.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(notification_validator_1.listNotificationsSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.list));
router.get('/unread-count', (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.unreadCount));
router.post('/read-all', (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.markAllRead));
router.post('/:id/read', (0, middleware_1.validate)(notification_validator_1.notificationIdSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.markRead));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map