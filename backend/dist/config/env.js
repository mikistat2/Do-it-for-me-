"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const booleanString = zod_1.z
    .string()
    .transform((value) => value.toLowerCase() === 'true');
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(8, 'JWT_ACCESS_SECRET is required'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(8, 'JWT_REFRESH_SECRET is required'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().int().min(8).max(15).default(12),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(20),
    LOG_LEVEL: zod_1.z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('info'),
    TELEGRAM_API_ID: zod_1.z.coerce.number().int().default(0),
    TELEGRAM_API_HASH: zod_1.z.string().default(''),
    TELEGRAM_SESSION: zod_1.z.string().default(''),
    TELEGRAM_RECONNECT_RETRIES: zod_1.z.coerce.number().int().default(10),
    TELEGRAM_RECONNECT_DELAY_MS: zod_1.z.coerce.number().int().default(5000),
    GEMINI_API_KEY: zod_1.z.string().default(''),
    GEMINI_MODEL: zod_1.z.string().default('gemini-1.5-flash'),
    GEMINI_BASE_URL: zod_1.z
        .string()
        .default('https://generativelanguage.googleapis.com/v1beta'),
    GEMINI_MAX_RETRIES: zod_1.z.coerce.number().int().default(3),
    GEMINI_RETRY_DELAY_MS: zod_1.z.coerce.number().int().default(2000),
    SMTP_HOST: zod_1.z.string().default('localhost'),
    SMTP_PORT: zod_1.z.coerce.number().int().default(587),
    SMTP_SECURE: booleanString.default('false'),
    SMTP_USER: zod_1.z.string().default(''),
    SMTP_PASSWORD: zod_1.z.string().default(''),
    SMTP_FROM_NAME: zod_1.z.string().default('JobBot'),
    SMTP_FROM_EMAIL: zod_1.z.string().default(''),
    EMAIL_MAX_RETRIES: zod_1.z.coerce.number().int().default(3),
    EMAIL_RETRY_DELAY_MS: zod_1.z.coerce.number().int().default(3000),
    DEFAULT_MATCH_THRESHOLD: zod_1.z.coerce.number().int().min(0).max(100).default(70),
    AUTO_APPLY_ENABLED: booleanString.default('false'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map