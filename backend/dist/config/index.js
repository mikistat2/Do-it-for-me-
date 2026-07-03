"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const env_1 = require("./env");
exports.config = {
    env: env_1.env.NODE_ENV,
    isProduction: env_1.env.NODE_ENV === 'production',
    isTest: env_1.env.NODE_ENV === 'test',
    server: {
        port: env_1.env.PORT,
        apiPrefix: env_1.env.API_PREFIX,
        corsOrigins: env_1.env.CORS_ORIGINS.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    },
    database: {
        url: env_1.env.DATABASE_URL,
    },
    jwt: {
        accessSecret: env_1.env.JWT_ACCESS_SECRET,
        refreshSecret: env_1.env.JWT_REFRESH_SECRET,
        accessExpiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
        bcryptSaltRounds: env_1.env.BCRYPT_SALT_ROUNDS,
    },
    rateLimit: {
        windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
        max: env_1.env.RATE_LIMIT_MAX,
        authMax: env_1.env.AUTH_RATE_LIMIT_MAX,
    },
    logging: {
        level: env_1.env.LOG_LEVEL,
    },
    telegram: {
        apiId: env_1.env.TELEGRAM_API_ID,
        apiHash: env_1.env.TELEGRAM_API_HASH,
        session: env_1.env.TELEGRAM_SESSION,
        reconnectRetries: env_1.env.TELEGRAM_RECONNECT_RETRIES,
        reconnectDelayMs: env_1.env.TELEGRAM_RECONNECT_DELAY_MS,
    },
    hf: {
        token: env_1.env.HF_TOKEN,
    },
    email: {
        host: env_1.env.SMTP_HOST,
        port: env_1.env.SMTP_PORT,
        secure: env_1.env.SMTP_SECURE,
        user: env_1.env.SMTP_USER,
        password: env_1.env.SMTP_PASSWORD,
        fromName: env_1.env.SMTP_FROM_NAME,
        fromEmail: env_1.env.SMTP_FROM_EMAIL,
        maxRetries: env_1.env.EMAIL_MAX_RETRIES,
        retryDelayMs: env_1.env.EMAIL_RETRY_DELAY_MS,
    },
    automation: {
        defaultMatchThreshold: env_1.env.DEFAULT_MATCH_THRESHOLD,
        autoApplyEnabled: env_1.env.AUTO_APPLY_ENABLED,
    },
};
//# sourceMappingURL=index.js.map