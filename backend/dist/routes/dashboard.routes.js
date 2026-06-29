"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../dashboard/dashboard.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/overview', (0, asyncHandler_1.asyncHandler)(dashboard_controller_1.dashboardController.overview));
router.get('/statistics', (0, asyncHandler_1.asyncHandler)(dashboard_controller_1.dashboardController.statistics));
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map