import { Response } from 'express';
import { draftService } from '../services/draft.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { ListDraftsQuery } from '../validators/draft.validator';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const draftController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const query = req.query as unknown as ListDraftsQuery;
    const result = await draftService.list(
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
    const draft = await draftService.get(requireUserId(req), req.params.id);
    sendSuccess(res, draft);
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const draft = await draftService.update(
      requireUserId(req),
      req.params.id,
      req.body,
    );
    sendSuccess(res, draft);
  },

  async reject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const draft = await draftService.reject(requireUserId(req), req.params.id);
    sendSuccess(res, draft);
  },
};
