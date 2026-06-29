"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
exports.authController = {
    async register(req, res) {
        const result = await auth_service_1.authService.register(req.body);
        (0, http_1.sendCreated)(res, result);
    },
    async login(req, res) {
        const result = await auth_service_1.authService.login(req.body);
        (0, http_1.sendSuccess)(res, result);
    },
    async refresh(req, res) {
        const tokens = await auth_service_1.authService.refresh(req.body.refreshToken);
        (0, http_1.sendSuccess)(res, tokens);
    },
    async logout(req, res) {
        await auth_service_1.authService.logout(req.body.refreshToken);
        (0, http_1.sendSuccess)(res, { message: 'Logged out successfully' });
    },
    async me(req, res) {
        if (!req.user) {
            throw new errors_1.UnauthorizedError('Authentication required');
        }
        const user = await auth_service_1.authService.me(req.user.id);
        (0, http_1.sendSuccess)(res, { user });
    },
};
//# sourceMappingURL=auth.controller.js.map