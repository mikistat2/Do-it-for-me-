import { z } from 'zod';
import { LogCategory, LogLevel } from '@prisma/client';
import { paginationQuery } from './common.validator';

export const listLogsSchema = z.object({
  query: paginationQuery.extend({
    level: z.nativeEnum(LogLevel).optional(),
    category: z.nativeEnum(LogCategory).optional(),
  }),
});

export type ListLogsQuery = z.infer<typeof listLogsSchema>['query'];
