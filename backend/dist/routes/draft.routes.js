"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const draft_controller_1 = require("../controllers/draft.controller");
const application_controller_1 = require("../controllers/application.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const middleware_1 = require("../middleware");
const draft_validator_1 = require("../validators/draft.validator");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.validate)(draft_validator_1.listDraftsSchema), (0, asyncHandler_1.asyncHandler)(draft_controller_1.draftController.list));
router.get('/:id', (0, middleware_1.validate)(draft_validator_1.draftIdSchema), (0, asyncHandler_1.asyncHandler)(draft_controller_1.draftController.get));
router.put('/:id', (0, middleware_1.validate)(draft_validator_1.updateDraftSchema), (0, asyncHandler_1.asyncHandler)(draft_controller_1.draftController.update));
router.post('/:id/approve', (0, middleware_1.validate)(draft_validator_1.draftIdSchema), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.approveDraft));
router.post('/:id/reject', (0, middleware_1.validate)(draft_validator_1.draftIdSchema), (0, asyncHandler_1.asyncHandler)(draft_controller_1.draftController.reject));
exports.default = router;
//# sourceMappingURL=draft.routes.js.map