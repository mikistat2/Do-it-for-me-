import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanString = z
  .string()
  .transform((value) => value.toLowerCase() === 'true');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(8, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  TELEGRAM_API_ID: z.coerce.number().int().default(0),
  TELEGRAM_API_HASH: z.string().default(''),
  TELEGRAM_SESSION: z.string().default(''),
  TELEGRAM_RECONNECT_RETRIES: z.coerce.number().int().default(10),
  TELEGRAM_RECONNECT_DELAY_MS: z.coerce.number().int().default(5000),

  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_BASE_URL: z
    .string()
    .default('https://generativelanguage.googleapis.com/v1beta'),
  GEMINI_MAX_RETRIES: z.coerce.number().int().default(3),
  GEMINI_RETRY_DELAY_MS: z.coerce.number().int().default(2000),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: booleanString.default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('JobBot'),
  SMTP_FROM_EMAIL: z.string().default(''),
  EMAIL_MAX_RETRIES: z.coerce.number().int().default(3),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int().default(3000),

  DEFAULT_MATCH_THRESHOLD: z.coerce.number().int().min(0).max(100).default(70),
  AUTO_APPLY_ENABLED: booleanString.default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
