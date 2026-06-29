import { JobStatus } from '@prisma/client';
import {
  jobRepository,
  JobFilter,
  JobSort,
  JobWithRelations,
} from '../repositories/job.repository';
import { buildPaginatedResult, resolvePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export const jobService = {
  async list(
    filter: JobFilter,
    sort: JobSort,
    page: number,
    pageSize: number,
  ) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await jobRepository.list(filter, sort, pagination);
    return buildPaginatedResult(items, total, pagination);
  },

  async get(userId: string, id: string): Promise<JobWithRelations> {
    const job = await jobRepository.findById(userId, id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    return job;
  },

  async archive(userId: string, id: string): Promise<void> {
    await this.get(userId, id);
    await jobRepository.updateStatus(id, JobStatus.ARCHIVED);
  },
};
