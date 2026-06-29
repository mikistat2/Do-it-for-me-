import { Router } from 'express';
import { dashboardController } from '../dashboard/dashboard.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/overview', asyncHandler(dashboardController.overview));
router.get('/statistics', asyncHandler(dashboardController.statistics));

export default router;
