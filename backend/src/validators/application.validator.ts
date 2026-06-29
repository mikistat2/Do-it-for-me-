import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';
import { idParam, paginationQuery } from './common.validator';

export const listApplicationsSchema = z.object({
  query: paginationQuery.extend({
    status: z.nativeEnum(ApplicationStatus).optional(),
  }),
});

export const applicationIdSchema = z.object({ params: idParam });

export const manualSendSchema = z.object({
  body: z.object({
    jobId: z.string().uuid(),
    toEmail: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(20000),
  }),
});

export type ListApplicationsQuery = z.infer<
  typeof listApplicationsSchema
>['query'];
export type ManualSendInput = z.infer<typeof manualSendSchema>['body'];
