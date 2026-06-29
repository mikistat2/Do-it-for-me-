import { Setting } from '@prisma/client';
import { settingsRepository } from '../repositories/settings.repository';
import { UpdateSettingsInput } from '../validators/settings.validator';

export const settingsService = {
  get(userId: string): Promise<Setting> {
    return settingsRepository.ensure(userId);
  },

  async update(userId: string, input: UpdateSettingsInput): Promise<Setting> {
    await settingsRepository.ensure(userId);
    return settingsRepository.update(userId, input);
  },

  async setPaused(userId: string, paused: boolean): Promise<Setting> {
    await settingsRepository.ensure(userId);
    return settingsRepository.update(userId, { automationPaused: paused });
  },
};
