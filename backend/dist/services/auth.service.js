"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const user_repository_1 = require("../repositories/user.repository");
const token_service_1 = require("./token.service");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const prisma_1 = require("../database/prisma");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createChildLogger)('auth');
const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
});
exports.authService = {
    async register(input) {
        const existing = await user_repository_1.userRepository.findByEmail(input.email);
        if (existing) {
            throw new errors_1.ConflictError('An account with this email already exists');
        }
        const passwordHash = await (0, password_1.hashPassword)(input.password);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: input.email,
                passwordHash,
                profile: {
                    create: {
                        fullName: input.fullName,
                        email: input.email,
                        skills: [],
                        preferredRoles: [],
                        preferredLocations: [],
                        minMatchScore: config_1.config.automation.defaultMatchThreshold,
                    },
                },
                settings: {
                    create: {
                        matchThreshold: config_1.config.automation.defaultMatchThreshold,
                        autoApply: config_1.config.automation.autoApplyEnabled,
                    },
                },
            },
        });
        log.info({ userId: user.id }, 'User registered');
        const tokens = await token_service_1.tokenService.issueTokenPair(token_service_1.tokenService.buildPayload(user));
        return { user: toPublicUser(user), tokens };
    },
    async login(input) {
        const user = await user_repository_1.userRepository.findByEmail(input.email);
        if (!user || !user.isActive) {
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        const valid = await (0, password_1.verifyPassword)(input.password, user.passwordHash);
        if (!valid) {
            log.warn({ email: input.email }, 'Failed login attempt');
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        log.info({ userId: user.id }, 'User logged in');
        const tokens = await token_service_1.tokenService.issueTokenPair(token_service_1.tokenService.buildPayload(user));
        return { user: toPublicUser(user), tokens };
    },
    async refresh(refreshToken) {
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const active = await token_service_1.tokenService.isRefreshTokenActive(refreshToken);
        if (!active) {
            throw new errors_1.UnauthorizedError('Refresh token is no longer valid');
        }
        const user = await user_repository_1.userRepository.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new errors_1.UnauthorizedError('Account is no longer active');
        }
        return token_service_1.tokenService.rotateRefreshToken(refreshToken, token_service_1.tokenService.buildPayload(user));
    },
    async logout(refreshToken) {
        await token_service_1.tokenService.revoke(refreshToken);
    },
    async me(userId) {
        const user = await user_repository_1.userRepository.findById(userId);
        if (!user) {
            throw new errors_1.UnauthorizedError('Account not found');
        }
        return toPublicUser(user);
    },
};
//# sourceMappingURL=auth.service.js.map