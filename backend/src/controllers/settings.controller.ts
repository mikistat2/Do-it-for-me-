import { Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const settingsController = {
  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await settingsService.get(requireUserId(req));
    sendSuccess(res, settings);
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await settingsService.update(requireUserId(req), req.body);
    sendSuccess(res, settings);
  },

  async pause(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await settingsService.setPaused(requireUserId(req), true);
    sendSuccess(res, settings);
  },

  async resume(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await settingsService.setPaused(requireUserId(req), false);
    sendSuccess(res, settings);
  },
};
