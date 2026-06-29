import { NotificationType } from '@prisma/client';
import {
  notificationRepository,
  NotificationFilter,
} from '../repositories/notification.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { resolvePagination, buildPaginatedResult } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    const settings = await settingsRepository.findByUserId(input.userId);
    if (settings) {
      if (input.type === NotificationType.HIGH_SCORE_JOB && !settings.notifyOnHighScore) {
        return null;
      }
      if (input.type === NotificationType.APPLICATION_SENT && !settings.notifyOnSent) {
        return null;
      }
      if (input.type === NotificationType.APPLICATION_FAILED && !settings.notifyOnFailed) {
        return null;
      }
    }
    return notificationRepository.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as any,
    });
  },

  async list(
    filter: NotificationFilter,
    page: number,
    pageSize: number,
  ) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await notificationRepository.list(filter, pagination);
    return buildPaginatedResult(items, total, pagination);
  },

  countUnread(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  },

  async markRead(userId: string, id: string): Promise<void> {
    const result = await notificationRepository.markRead(userId, id);
    if (result.count === 0) {
      throw new NotFoundError('Notification not found');
    }
  },

  async markAllRead(userId: string): Promise<number> {
    const result = await notificationRepository.markAllRead(userId);
    return result.count;
  },
};
