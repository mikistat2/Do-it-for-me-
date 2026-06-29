import { ApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface ApplicationFilter {
  userId: string;
  status?: ApplicationStatus;
  search?: string;
}

const applicationInclude = {
  job: { include: { match: true } },
} satisfies Prisma.ApplicationInclude;

const buildWhere = (
  filter: ApplicationFilter,
): Prisma.ApplicationWhereInput => {
  const where: Prisma.ApplicationWhereInput = { userId: filter.userId };
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { subject: { contains: filter.search, mode: 'insensitive' } },
      { toEmail: { contains: filter.search, mode: 'insensitive' } },
      { job: { title: { contains: filter.search, mode: 'insensitive' } } },
    ];
  }
  return where;
};

export const applicationRepository = {
  findByUserAndJob(userId: string, jobId: string) {
    return prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
  },

  create(data: {
    jobId: string;
    userId: string;
    draftId?: string | null;
    toEmail: string;
    subject: string;
    body: string;
    status: ApplicationStatus;
  }) {
    return prisma.application.create({ data });
  },

  findById(userId: string, id: string) {
    return prisma.application.findFirst({
      where: { id, userId },
      include: applicationInclude,
    });
  },

  async list(filter: ApplicationFilter, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.application.count({ where }),
    ]);
    return { items, total };
  },

  markSent(id: string, messageId: string) {
    return prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.SENT,
        messageId,
        sentAt: new Date(),
        attempts: { increment: 1 },
        error: null,
      },
    });
  },

  markFailed(id: string, error: string) {
    return prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.FAILED,
        attempts: { increment: 1 },
        error,
      },
    });
  },
};
