import { fromAddress, getTransporter } from './mailer';
import { config } from '../config';
import { withRetry } from '../utils/retry';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
}

const toHtml = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

export const emailService = {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    return withRetry(
      async () => {
        const info = await getTransporter().sendMail({
          from: fromAddress(),
          to: input.to,
          subject: input.subject,
          text: input.body,
          html: toHtml(input.body),
        });
        await logService.info(LogCategory.EMAIL, 'Application email sent', {
          to: input.to,
          messageId: info.messageId,
        });
        return { messageId: info.messageId };
      },
      {
        retries: config.email.maxRetries,
        delayMs: config.email.retryDelayMs,
        label: 'send-email',
        onRetry: (error, attempt) => {
          void logService.warn(LogCategory.EMAIL, 'Retrying email send', {
            to: input.to,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      },
    );
  },
};
