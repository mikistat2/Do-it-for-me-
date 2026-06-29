"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = void 0;
const profile_service_1 = require("../services/profile.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.profileController = {
    async get(req, res) {
        const profile = await profile_service_1.profileService.get(requireUserId(req));
        (0, http_1.sendSuccess)(res, profile);
    },
    async update(req, res) {
        const profile = await profile_service_1.profileService.update(requireUserId(req), req.body);
        (0, http_1.sendSuccess)(res, profile);
    },
};
//# sourceMappingURL=profile.controller.js.map