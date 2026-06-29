"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const job_controller_1 = require("../controllers/job.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const job_validator_1 = require("../validators/job.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(job_validator_1.listJobsSchema), (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.list));
router.get('/:id', (0, middleware_1.validate)(job_validator_1.jobIdSchema), (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.get));
router.post('/:id/archive', (0, middleware_1.validate)(job_validator_1.jobIdSchema), (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.archive));
exports.default = router;
//# sourceMappingURL=job.routes.js.map