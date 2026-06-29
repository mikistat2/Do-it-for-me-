import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { AuthTokenPayload, TokenPair } from '../types';
import { config } from '../config';

const parseDurationToMs = (duration: string): number => {
  const match = /^([0-9]+)([smhd])$/.exec(duration.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * unitMs[unit];
};

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const tokenService = {
  async issueTokenPair(payload: AuthTokenPayload): Promise<TokenPair> {
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(config.jwt.refreshExpiresIn),
    );

    await refreshTokenRepository.create({
      userId: payload.sub,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return { accessToken, refreshToken };
  },

  async rotateRefreshToken(
    oldToken: string,
    payload: AuthTokenPayload,
  ): Promise<TokenPair> {
    await refreshTokenRepository.revokeByHash(hashToken(oldToken));
    return this.issueTokenPair(payload);
  },

  async isRefreshTokenActive(token: string): Promise<boolean> {
    const stored = await refreshTokenRepository.findByHash(hashToken(token));
    if (!stored || stored.revoked) {
      return false;
    }
    return stored.expiresAt.getTime() > Date.now();
  },

  async revoke(token: string): Promise<void> {
    await refreshTokenRepository.revokeByHash(hashToken(token));
  },

  async revokeAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
  },

  buildPayload(user: {
    id: string;
    email: string;
    role: UserRole;
  }): AuthTokenPayload {
    return { sub: user.id, email: user.email, role: user.role };
  },
};
