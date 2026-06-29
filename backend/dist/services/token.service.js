"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const refreshToken_repository_1 = require("../repositories/refreshToken.repository");
const jwt_1 = require("../utils/jwt");
const config_1 = require("../config");
const parseDurationToMs = (duration) => {
    const match = /^([0-9]+)([smhd])$/.exec(duration.trim());
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return value * unitMs[unit];
};
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
exports.tokenService = {
    async issueTokenPair(payload) {
        const accessToken = (0, jwt_1.signAccessToken)(payload);
        const refreshToken = (0, jwt_1.signRefreshToken)(payload);
        const expiresAt = new Date(Date.now() + parseDurationToMs(config_1.config.jwt.refreshExpiresIn));
        await refreshToken_repository_1.refreshTokenRepository.create({
            userId: payload.sub,
            tokenHash: hashToken(refreshToken),
            expiresAt,
        });
        return { accessToken, refreshToken };
    },
    async rotateRefreshToken(oldToken, payload) {
        await refreshToken_repository_1.refreshTokenRepository.revokeByHash(hashToken(oldToken));
        return this.issueTokenPair(payload);
    },
    async isRefreshTokenActive(token) {
        const stored = await refreshToken_repository_1.refreshTokenRepository.findByHash(hashToken(token));
        if (!stored || stored.revoked) {
            return false;
        }
        return stored.expiresAt.getTime() > Date.now();
    },
    async revoke(token) {
        await refreshToken_repository_1.refreshTokenRepository.revokeByHash(hashToken(token));
    },
    async revokeAll(userId) {
        await refreshToken_repository_1.refreshTokenRepository.revokeAllForUser(userId);
    },
    buildPayload(user) {
        return { sub: user.id, email: user.email, role: user.role };
    },
};
//# sourceMappingURL=token.service.js.map