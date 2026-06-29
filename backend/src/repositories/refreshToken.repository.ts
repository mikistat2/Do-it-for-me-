import { RefreshToken } from '@prisma/client';
import { prisma } from '../database/prisma';

export const refreshTokenRepository = {
  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeByHash(tokenHash: string): Promise<number> {
    return prisma.refreshToken
      .updateMany({ where: { tokenHash }, data: { revoked: true } })
      .then((result) => result.count);
  },

  revokeAllForUser(userId: string): Promise<number> {
    return prisma.refreshToken
      .updateMany({ where: { userId, revoked: false }, data: { revoked: true } })
      .then((result) => result.count);
  },

  deleteExpired(): Promise<number> {
    return prisma.refreshToken
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .then((result) => result.count);
  },
};
