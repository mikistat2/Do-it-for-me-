import { Response } from 'express';
import { applicationService } from '../services/application.service';
import { sendCreated, sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { ListApplicationsQuery } from '../validators/application.validator';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const applicationController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const query = req.query as unknown as ListApplicationsQuery;
    const result = await applicationService.list(
      { userId, status: query.status, search: query.search },
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
    const application = await applicationService.get(
      requireUserId(req),
      req.params.id,
    );
    sendSuccess(res, application);
  },

  async manualSend(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const { jobId, toEmail, subject, body } = req.body;

    // If full payload is provided, dispatch directly; otherwise auto-generate
    const result =
      toEmail && subject && body
        ? await applicationService.dispatch({ userId, jobId, toEmail, subject, body })
        : await applicationService.sendFromJob(userId, jobId);

    sendCreated(res, result);
  },

  async approveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const result = await applicationService.approveDraft(userId, req.params.id);
    sendCreated(res, result);
  },
};
