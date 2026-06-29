import { env } from './env';

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  server: {
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  telegram: {
    apiId: env.TELEGRAM_API_ID,
    apiHash: env.TELEGRAM_API_HASH,
    session: env.TELEGRAM_SESSION,
    reconnectRetries: env.TELEGRAM_RECONNECT_RETRIES,
    reconnectDelayMs: env.TELEGRAM_RECONNECT_DELAY_MS,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    baseUrl: env.GEMINI_BASE_URL,
    maxRetries: env.GEMINI_MAX_RETRIES,
    retryDelayMs: env.GEMINI_RETRY_DELAY_MS,
  },
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,
    maxRetries: env.EMAIL_MAX_RETRIES,
    retryDelayMs: env.EMAIL_RETRY_DELAY_MS,
  },
  automation: {
    defaultMatchThreshold: env.DEFAULT_MATCH_THRESHOLD,
    autoApplyEnabled: env.AUTO_APPLY_ENABLED,
  },
} as const;

export type AppConfig = typeof config;
