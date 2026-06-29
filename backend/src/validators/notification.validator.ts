import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { idParam, paginationQuery } from './common.validator';

export const listNotificationsSchema = z.object({
  query: paginationQuery.extend({
    isRead: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const notificationIdSchema = z.object({ params: idParam });

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsSchema
>['query'];
