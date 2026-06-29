"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_controller_1 = require("../controllers/application.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const application_validator_1 = require("../validators/application.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(application_validator_1.listApplicationsSchema), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.list));
router.post('/send', (0, middleware_1.validate)(application_validator_1.manualSendSchema), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.manualSend));
router.get('/:id', (0, middleware_1.validate)(application_validator_1.applicationIdSchema), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.get));
exports.default = router;
//# sourceMappingURL=application.routes.js.map