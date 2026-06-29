import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import { updateSettingsSchema } from '../validators/settings.validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(settingsController.get));
router.put(
  '/',
  validate(updateSettingsSchema),
  asyncHandler(settingsController.update),
);
router.post('/pause', asyncHandler(settingsController.pause));
router.post('/resume', asyncHandler(settingsController.resume));

export default router;
