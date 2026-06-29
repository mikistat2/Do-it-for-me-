import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface NotificationFilter {
  userId: string;
  isRead?: boolean;
  type?: NotificationType;
  search?: string;
}

const buildWhere = (
  filter: NotificationFilter,
): Prisma.NotificationWhereInput => {
  const where: Prisma.NotificationWhereInput = { userId: filter.userId };
  if (typeof filter.isRead === 'boolean') {
    where.isRead = filter.isRead;
  }
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { message: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  return where;
};

export const notificationRepository = {
  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.notification.create({ data });
  },

  async list(filter: NotificationFilter, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  },

  countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  markRead(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};
