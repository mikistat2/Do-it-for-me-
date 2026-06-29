"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const settings_validator_1 = require("../validators/settings.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, asyncHandler_1.asyncHandler)(settings_controller_1.settingsController.get));
router.put('/', (0, middleware_1.validate)(settings_validator_1.updateSettingsSchema), (0, asyncHandler_1.asyncHandler)(settings_controller_1.settingsController.update));
router.post('/pause', (0, asyncHandler_1.asyncHandler)(settings_controller_1.settingsController.pause));
router.post('/resume', (0, asyncHandler_1.asyncHandler)(settings_controller_1.settingsController.resume));
exports.default = router;
//# sourceMappingURL=settings.routes.js.map