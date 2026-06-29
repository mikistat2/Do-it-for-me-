import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendCreated, sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    sendCreated(res, result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, tokens);
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { message: 'Logged out successfully' });
  },

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const user = await authService.me(req.user.id);
    sendSuccess(res, { user });
  },
};
