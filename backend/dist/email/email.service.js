"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const mailer_1 = require("./mailer");
const config_1 = require("../config");
const retry_1 = require("../utils/retry");
const log_service_1 = require("../services/log.service");
const client_1 = require("@prisma/client");
const toHtml = (body) => body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
exports.emailService = {
    async send(input) {
        return (0, retry_1.withRetry)(async () => {
            const info = await (0, mailer_1.getTransporter)().sendMail({
                from: (0, mailer_1.fromAddress)(),
                to: input.to,
                subject: input.subject,
                text: input.body,
                html: toHtml(input.body),
            });
            await log_service_1.logService.info(client_1.LogCategory.EMAIL, 'Application email sent', {
                to: input.to,
                messageId: info.messageId,
            });
            return { messageId: info.messageId };
        }, {
            retries: config_1.config.email.maxRetries,
            delayMs: config_1.config.email.retryDelayMs,
            label: 'send-email',
            onRetry: (error, attempt) => {
                void log_service_1.logService.warn(client_1.LogCategory.EMAIL, 'Retrying email send', {
                    to: input.to,
                    attempt,
                    error: error instanceof Error ? error.message : String(error),
                });
            },
        });
    },
};
//# sourceMappingURL=email.service.js.map