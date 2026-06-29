"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
router.post('/register', middleware_1.authRateLimiter, (0, middleware_1.validate)(auth_validator_1.registerSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.register));
router.post('/login', middleware_1.authRateLimiter, (0, middleware_1.validate)(auth_validator_1.loginSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.login));
router.post('/refresh', (0, middleware_1.validate)(auth_validator_1.refreshSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.refresh));
router.post('/logout', (0, middleware_1.validate)(auth_validator_1.logoutSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.logout));
router.get('/me', middleware_1.authenticate, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.me));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map