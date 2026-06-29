import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import {
  applicationIdSchema,
  listApplicationsSchema,
  manualSendSchema,
} from '../validators/application.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(listApplicationsSchema),
  asyncHandler(applicationController.list),
);
router.post(
  '/send',
  validate(manualSendSchema),
  asyncHandler(applicationController.manualSend),
);
router.get(
  '/:id',
  validate(applicationIdSchema),
  asyncHandler(applicationController.get),
);

export default router;
