"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const channel_controller_1 = require("../controllers/channel.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const channel_validator_1 = require("../validators/channel.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(channel_validator_1.listChannelsSchema), (0, asyncHandler_1.asyncHandler)(channel_controller_1.channelController.list));
router.post('/', (0, middleware_1.validate)(channel_validator_1.createChannelSchema), (0, asyncHandler_1.asyncHandler)(channel_controller_1.channelController.create));
router.put('/:id', (0, middleware_1.validate)(channel_validator_1.updateChannelSchema), (0, asyncHandler_1.asyncHandler)(channel_controller_1.channelController.update));
router.delete('/:id', (0, middleware_1.validate)(channel_validator_1.channelIdSchema), (0, asyncHandler_1.asyncHandler)(channel_controller_1.channelController.remove));
router.post('/:id/sync', (0, middleware_1.validate)(channel_validator_1.channelIdSchema), (0, asyncHandler_1.asyncHandler)(channel_controller_1.channelController.sync));
exports.default = router;
//# sourceMappingURL=channel.routes.js.map