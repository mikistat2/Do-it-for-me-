import { LogCategory, LogLevel, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  search?: string;
}

const buildWhere = (filter: LogFilter): Prisma.LogWhereInput => {
  const where: Prisma.LogWhereInput = {};
  if (filter.level) {
    where.level = filter.level;
  }
  if (filter.category) {
    where.category = filter.category;
  }
  if (filter.search) {
    where.message = { contains: filter.search, mode: 'insensitive' };
  }
  return where;
};

export const logRepository = {
  create(data: {
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: Prisma.InputJsonValue;
  }) {
    return prisma.log.create({ data });
  },

  async list(filter: LogFilter, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.log.count({ where }),
    ]);
    return { items, total };
  },
};
