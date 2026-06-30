import { Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { isTelegramConfigured } from '../telegram/telegramClient';
import { config } from '../config';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const automationController = {
  async status(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const settings = await settingsService.get(userId);

    const automationStatus = {
      automationPaused: settings.automationPaused,
      autoApply: settings.autoApply,
      matchThreshold: settings.matchThreshold,
      telegramConfigured: isTelegramConfigured(),
      hfConfigured: Boolean(config.hf.token),
    };

    sendSuccess(res, automationStatus);
  },

  async pause(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    await settingsService.update(userId, { automationPaused: true });
    sendSuccess(res, { message: 'Automation paused' });
  },

  async resume(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    await settingsService.update(userId, { automationPaused: false });
    sendSuccess(res, { message: 'Automation resumed' });
  },
};
