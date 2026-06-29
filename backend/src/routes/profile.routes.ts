import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import { updateProfileSchema } from '../validators/profile.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(profileController.get));
router.put(
  '/',
  validate(updateProfileSchema),
  asyncHandler(profileController.update),
);

export default router;
