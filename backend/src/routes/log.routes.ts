import { Router } from 'express';
import { logController } from '../controllers/log.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import { listLogsSchema } from '../validators/log.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listLogsSchema), asyncHandler(logController.list));

export default router;
