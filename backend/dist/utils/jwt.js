"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.signRefreshToken = exports.signAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errors_1 = require("./errors");
const signAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, config_1.config.jwt.accessSecret, {
    expiresIn: config_1.config.jwt.accessExpiresIn,
});
exports.signAccessToken = signAccessToken;
const signRefreshToken = (payload) => jsonwebtoken_1.default.sign(payload, config_1.config.jwt.refreshSecret, {
    expiresIn: config_1.config.jwt.refreshExpiresIn,
});
exports.signRefreshToken = signRefreshToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
    }
    catch {
        throw new errors_1.UnauthorizedError('Invalid or expired access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret);
    }
    catch {
        throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=jwt.js.map