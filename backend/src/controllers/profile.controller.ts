import { Response } from 'express';
import { profileService } from '../services/profile.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const profileController = {
  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await profileService.get(requireUserId(req));
    sendSuccess(res, profile);
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await profileService.update(requireUserId(req), req.body);
    sendSuccess(res, profile);
  },
};
