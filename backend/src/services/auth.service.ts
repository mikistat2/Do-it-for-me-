import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { tokenService } from './token.service';
import { hashPassword, verifyPassword } from '../utils/password';
import { verifyRefreshToken } from '../utils/jwt';
import {
  ConflictError,
  UnauthorizedError,
} from '../utils/errors';
import { TokenPair } from '../types';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

const log = createChildLogger('auth');

export interface PublicUser {
  id: string;
  email: string;
  role: User['role'];
  isActive: boolean;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
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
            minMatchScore: config.automation.defaultMatchThreshold,
          },
        },
        settings: {
          create: {
            matchThreshold: config.automation.defaultMatchThreshold,
            autoApply: config.automation.autoApplyEnabled,
          },
        },
      },
    });

    log.info({ userId: user.id }, 'User registered');
    const tokens = await tokenService.issueTokenPair(
      tokenService.buildPayload(user),
    );
    return { user: toPublicUser(user), tokens };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      log.warn({ email: input.email }, 'Failed login attempt');
      throw new UnauthorizedError('Invalid credentials');
    }

    log.info({ userId: user.id }, 'User logged in');
    const tokens = await tokenService.issueTokenPair(
      tokenService.buildPayload(user),
    );
    return { user: toPublicUser(user), tokens };
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = verifyRefreshToken(refreshToken);
    const active = await tokenService.isRefreshTokenActive(refreshToken);
    if (!active) {
      throw new UnauthorizedError('Refresh token is no longer valid');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is no longer active');
    }

    return tokenService.rotateRefreshToken(
      refreshToken,
      tokenService.buildPayload(user),
    );
  },

  async logout(refreshToken: string): Promise<void> {
    await tokenService.revoke(refreshToken);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Account not found');
    }
    return toPublicUser(user);
  },
};
