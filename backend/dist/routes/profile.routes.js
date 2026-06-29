"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const profile_validator_1 = require("../validators/profile.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, asyncHandler_1.asyncHandler)(profile_controller_1.profileController.get));
router.put('/', (0, middleware_1.validate)(profile_validator_1.updateProfileSchema), (0, asyncHandler_1.asyncHandler)(profile_controller_1.profileController.update));
exports.default = router;
//# sourceMappingURL=profile.routes.js.map