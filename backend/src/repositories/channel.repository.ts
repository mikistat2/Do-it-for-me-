import { ChannelStatus, Prisma, TelegramChannel } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface ChannelFilter {
  userId: string;
  status?: ChannelStatus;
  search?: string;
}

const buildWhere = (
  filter: ChannelFilter,
): Prisma.TelegramChannelWhereInput => {
  const where: Prisma.TelegramChannelWhereInput = { userId: filter.userId };
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { username: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  return where;
};

export const channelRepository = {
  create(data: {
    userId: string;
    channelId: string;
    title: string;
    username?: string | null;
  }): Promise<TelegramChannel> {
    return prisma.telegramChannel.create({ data });
  },

  findById(userId: string, id: string): Promise<TelegramChannel | null> {
    return prisma.telegramChannel.findFirst({ where: { id, userId } });
  },

  findActiveForUser(userId: string): Promise<TelegramChannel[]> {
    return prisma.telegramChannel.findMany({
      where: { userId, status: ChannelStatus.ACTIVE },
    });
  },

  async list(filter: ChannelFilter, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.telegramChannel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.telegramChannel.count({ where }),
    ]);
    return { items, total };
  },

  update(id: string, data: Prisma.TelegramChannelUpdateInput) {
    return prisma.telegramChannel.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.telegramChannel.delete({ where: { id } });
  },
};
