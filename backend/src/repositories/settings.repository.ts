import { Prisma, Setting } from '@prisma/client';
import { prisma } from '../database/prisma';
import { config } from '../config';

export const settingsRepository = {
  findByUserId(userId: string): Promise<Setting | null> {
    return prisma.setting.findUnique({ where: { userId } });
  },

  ensure(userId: string): Promise<Setting> {
    return prisma.setting.upsert({
      where: { userId },
      create: {
        userId,
        matchThreshold: config.automation.defaultMatchThreshold,
        autoApply: config.automation.autoApplyEnabled,
      },
      update: {},
    });
  },

  update(userId: string, data: Prisma.SettingUpdateInput): Promise<Setting> {
    return prisma.setting.update({ where: { userId }, data });
  },
};
