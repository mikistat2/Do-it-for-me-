import { Response } from 'express';
import { channelService } from '../services/channel.service';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { ListChannelsQuery } from '../validators/channel.validator';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const channelController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const query = req.query as unknown as ListChannelsQuery;
    const result = await channelService.list(
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

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const channel = await channelService.create(requireUserId(req), req.body);
    sendCreated(res, channel);
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const channel = await channelService.update(
      requireUserId(req),
      req.params.id,
      req.body,
    );
    sendSuccess(res, channel);
  },

  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    await channelService.remove(requireUserId(req), req.params.id);
    sendNoContent(res);
  },

  async sync(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const result = await channelService.syncHistory(userId, req.params.id);
    sendSuccess(res, result);
  },
};
