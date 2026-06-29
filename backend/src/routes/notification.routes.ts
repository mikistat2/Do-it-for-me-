import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import {
  listNotificationsSchema,
  notificationIdSchema,
} from '../validators/notification.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(listNotificationsSchema),
  asyncHandler(notificationController.list),
);
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.post(
  '/:id/read',
  validate(notificationIdSchema),
  asyncHandler(notificationController.markRead),
);

export default router;
