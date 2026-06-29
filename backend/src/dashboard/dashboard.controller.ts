import { Response } from 'express';
import { statisticsService } from './statistics.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const dashboardController = {
  async overview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const [summary, jobsByStatus, recentApplications, pendingDrafts] =
      await Promise.all([
        statisticsService.summary(userId),
        statisticsService.jobsByStatus(userId),
        statisticsService.recentApplications(userId),
        statisticsService.pendingDrafts(userId),
      ]);
    sendSuccess(res, {
      summary,
      jobsByStatus,
      recentApplications,
      pendingDrafts,
    });
  },

  async statistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const [summary, jobsByStatus, applicationsTrend] = await Promise.all([
      statisticsService.summary(userId),
      statisticsService.jobsByStatus(userId),
      statisticsService.applicationsTrend(userId),
    ]);
    sendSuccess(res, { summary, jobsByStatus, applicationsTrend });
  },
};
