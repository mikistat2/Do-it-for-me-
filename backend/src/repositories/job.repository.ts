import { JobStatus, Prisma, RemoteType } from '@prisma/client';
import { prisma } from '../database/prisma';
import { PaginationParams } from '../utils/pagination';

export interface JobFilter {
  userId: string;
  status?: JobStatus;
  remoteType?: RemoteType;
  company?: string;
  search?: string;
  minScore?: number;
}

export interface JobSort {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE_FIELDS = new Set(['createdAt', 'title', 'company', 'status']);

const jobInclude = {
  skills: true,
  locations: true,
  match: true,
  message: true,
} satisfies Prisma.JobInclude;

export type JobWithRelations = Prisma.JobGetPayload<{
  include: typeof jobInclude;
}>;

const buildWhere = (filter: JobFilter): Prisma.JobWhereInput => {
  const where: Prisma.JobWhereInput = { userId: filter.userId };
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.remoteType) {
    where.remoteType = filter.remoteType;
  }
  if (filter.company) {
    where.company = { contains: filter.company, mode: 'insensitive' };
  }
  if (typeof filter.minScore === 'number') {
    where.match = { score: { gte: filter.minScore } };
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { company: { contains: filter.search, mode: 'insensitive' } },
      { description: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  return where;
};

const buildOrderBy = (sort: JobSort): Prisma.JobOrderByWithRelationInput => {
  const field = SORTABLE_FIELDS.has(sort.sortBy) ? sort.sortBy : 'createdAt';
  return { [field]: sort.sortOrder } as Prisma.JobOrderByWithRelationInput;
};

export const jobRepository = {
  async list(filter: JobFilter, sort: JobSort, pagination: PaginationParams) {
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: jobInclude,
        orderBy: buildOrderBy(sort),
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.job.count({ where }),
    ]);
    return { items, total };
  },

  findById(userId: string, id: string): Promise<JobWithRelations | null> {
    return prisma.job.findFirst({
      where: { id, userId },
      include: jobInclude,
    });
  },

  findByHash(userId: string, contentHash: string) {
    return prisma.job.findUnique({
      where: { userId_contentHash: { userId, contentHash } },
      include: jobInclude,
    });
  },

  updateStatus(id: string, status: JobStatus) {
    return prisma.job.update({ where: { id }, data: { status } });
  },
};
