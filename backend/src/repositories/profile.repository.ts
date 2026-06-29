import { Prisma, Profile } from '@prisma/client';
import { prisma } from '../database/prisma';

export const profileRepository = {
  findByUserId(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({ where: { userId } });
  },

  update(userId: string, data: Prisma.ProfileUpdateInput): Promise<Profile> {
    return prisma.profile.update({ where: { userId }, data });
  },

  upsert(
    userId: string,
    create: Prisma.ProfileCreateInput,
    update: Prisma.ProfileUpdateInput,
  ): Promise<Profile> {
    return prisma.profile.upsert({
      where: { userId },
      create,
      update,
    });
  },
};
