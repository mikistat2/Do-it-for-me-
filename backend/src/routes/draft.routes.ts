import { Router } from 'express';
import { draftController } from '../controllers/draft.controller';
import { applicationController } from '../controllers/application.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import {
  draftIdSchema,
  listDraftsSchema,
  updateDraftSchema,
} from '../validators/draft.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listDraftsSchema), asyncHandler(draftController.list));
router.get('/:id', validate(draftIdSchema), asyncHandler(draftController.get));
router.put(
  '/:id',
  validate(updateDraftSchema),
  asyncHandler(draftController.update),
);
router.post(
  '/:id/approve',
  validate(draftIdSchema),
  asyncHandler(applicationController.approveDraft),
);
router.post(
  '/:id/reject',
  validate(draftIdSchema),
  asyncHandler(draftController.reject),
);

export default router;
