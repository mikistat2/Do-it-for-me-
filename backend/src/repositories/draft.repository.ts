import { DraftStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface DraftFilter {
  userId: string;
  status?: DraftStatus;
  search?: string;
}

const draftInclude = {
  job: { include: { match: true } },
} satisfies Prisma.ApplicationDraftInclude;

const buildWhere = (
  filter: DraftFilter,
): Prisma.ApplicationDraftWhereInput => {
  const where: Prisma.ApplicationDraftWhereInput = { userId: filter.userId };
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

export const draftRepository = {
  create(data: {
    jobId: string;
    userId: string;
    subject: string;
    body: string;
    toEmail: string;
  }) {
    return prisma.applicationDraft.create({ data });
  },

  findById(userId: string, id: string) {
    return prisma.applicationDraft.findFirst({
      where: { id, userId },
      include: draftInclude,
    });
  },

  async list(filter: DraftFilter, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.applicationDraft.findMany({
        where,
        include: draftInclude,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.applicationDraft.count({ where }),
    ]);
    return { items, total };
  },

  updateStatus(id: string, status: DraftStatus) {
    return prisma.applicationDraft.update({ where: { id }, data: { status } });
  },

  update(
    id: string,
    data: Prisma.ApplicationDraftUpdateInput,
  ) {
    return prisma.applicationDraft.update({ where: { id }, data });
  },
};
