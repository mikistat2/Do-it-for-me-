import { Response } from 'express';
import { jobService } from '../services/job.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { ListJobsQuery } from '../validators/job.validator';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const jobController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const query = req.query as unknown as ListJobsQuery;
    const result = await jobService.list(
      {
        userId,
        status: query.status,
        remoteType: query.remoteType,
        company: query.company,
        minScore: query.minScore,
        search: query.search,
      },
      { sortBy: query.sortBy ?? 'createdAt', sortOrder: query.sortOrder },
      query.page,
      query.pageSize,
    );
    sendSuccess(res, result.items, 200, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    });
  },

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const job = await jobService.get(requireUserId(req), req.params.id);
    sendSuccess(res, job);
  },

  async archive(req: AuthenticatedRequest, res: Response): Promise<void> {
    await jobService.archive(requireUserId(req), req.params.id);
    sendSuccess(res, { message: 'Job archived' });
  },
};
