import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, validate, authRateLimiter } from '../middleware';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(authController.refresh),
);

router.post(
  '/logout',
  validate(logoutSchema),
  asyncHandler(authController.logout),
);

router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
