import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import { jobIdSchema, listJobsSchema } from '../validators/job.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listJobsSchema), asyncHandler(jobController.list));
router.get('/:id', validate(jobIdSchema), asyncHandler(jobController.get));
router.post(
  '/:id/archive',
  validate(jobIdSchema),
  asyncHandler(jobController.archive),
);

export default router;
