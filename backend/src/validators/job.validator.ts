import { z } from 'zod';
import { JobStatus, RemoteType } from '@prisma/client';
import { idParam, paginationQuery } from './common.validator';

export const listJobsSchema = z.object({
  query: paginationQuery.extend({
    status: z.nativeEnum(JobStatus).optional(),
    remoteType: z.nativeEnum(RemoteType).optional(),
    company: z.string().trim().max(80).optional(),
    minScore: z.coerce.number().int().min(0).max(100).optional(),
  }),
});

export const jobIdSchema = z.object({ params: idParam });

export type ListJobsQuery = z.infer<typeof listJobsSchema>['query'];
