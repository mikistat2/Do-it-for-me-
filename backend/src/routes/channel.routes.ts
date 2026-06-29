import { Router } from 'express';
import { channelController } from '../controllers/channel.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate } from '../middleware';
import {
  channelIdSchema,
  createChannelSchema,
  listChannelsSchema,
  updateChannelSchema,
} from '../validators/channel.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(listChannelsSchema),
  asyncHandler(channelController.list),
);
router.post(
  '/',
  validate(createChannelSchema),
  asyncHandler(channelController.create),
);
router.put(
  '/:id',
  validate(updateChannelSchema),
  asyncHandler(channelController.update),
);
router.delete(
  '/:id',
  validate(channelIdSchema),
  asyncHandler(channelController.remove),
);
router.post(
  '/:id/sync',
  validate(channelIdSchema),
  asyncHandler(channelController.sync),
);

export default router;
