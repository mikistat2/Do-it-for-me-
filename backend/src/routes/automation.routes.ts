import { Router } from 'express';
import { automationController } from '../controllers/automation.controller';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/status', asyncHandler(automationController.status));
router.post('/pause', asyncHandler(automationController.pause));
router.post('/resume', asyncHandler(automationController.resume));

export default router;
