import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParam = z.object({
  id: z.string().uuid('A valid id is required'),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
