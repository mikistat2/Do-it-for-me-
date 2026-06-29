"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const log_controller_1 = require("../controllers/log.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const log_validator_1 = require("../validators/log.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(log_validator_1.listLogsSchema), (0, asyncHandler_1.asyncHandler)(log_controller_1.logController.list));
exports.default = router;
//# sourceMappingURL=log.routes.js.map