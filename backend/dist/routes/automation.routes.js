"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const automation_controller_1 = require("../controllers/automation.controller");
const middleware_1 = require("../middleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/status', (0, asyncHandler_1.asyncHandler)(automation_controller_1.automationController.status));
router.post('/pause', (0, asyncHandler_1.asyncHandler)(automation_controller_1.automationController.pause));
router.post('/resume', (0, asyncHandler_1.asyncHandler)(automation_controller_1.automationController.resume));
exports.default = router;
//# sourceMappingURL=automation.routes.js.map