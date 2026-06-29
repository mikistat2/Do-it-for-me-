"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.globalRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
const rateLimitMessage = {
    success: false,
    error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
    },
};
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage,
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage,
});
//# sourceMappingURL=rateLimiter.js.map