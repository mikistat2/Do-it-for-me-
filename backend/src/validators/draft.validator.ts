import { z } from 'zod';
import { DraftStatus } from '@prisma/client';
import { idParam, paginationQuery } from './common.validator';

export const listDraftsSchema = z.object({
  query: paginationQuery.extend({
    status: z.nativeEnum(DraftStatus).optional(),
  }),
});

export const draftIdSchema = z.object({ params: idParam });

export const updateDraftSchema = z.object({
  params: idParam,
  body: z.object({
    subject: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).max(20000).optional(),
    toEmail: z.string().trim().toLowerCase().email().optional(),
  }),
});

export type ListDraftsQuery = z.infer<typeof listDraftsSchema>['query'];
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>['body'];
