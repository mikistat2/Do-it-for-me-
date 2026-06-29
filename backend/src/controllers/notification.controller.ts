import { Response } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/http';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { ListNotificationsQuery } from '../validators/notification.validator';

const requireUserId = (req: AuthenticatedRequest): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user.id;
};

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireUserId(req);
    const query = req.query as unknown as ListNotificationsQuery;
    const result = await notificationService.list(
      { userId, isRead: query.isRead, type: query.type, search: query.search },
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

  async unreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const count = await notificationService.countUnread(requireUserId(req));
    sendSuccess(res, { count });
  },

  async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    await notificationService.markRead(requireUserId(req), req.params.id);
    sendSuccess(res, { message: 'Notification marked as read' });
  },

  async markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const count = await notificationService.markAllRead(requireUserId(req));
    sendSuccess(res, { count });
  },
};
