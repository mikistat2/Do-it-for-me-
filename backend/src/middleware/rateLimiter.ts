import rateLimit from 'express-rate-limit';
import { config } from '../config';

const rateLimitMessage = {
  success: false,
  error: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
  },
};

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});
