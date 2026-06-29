import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;

export const getTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth:
      config.email.user && config.email.password
        ? { user: config.email.user, pass: config.email.password }
        : undefined,
  });
  return transporter;
};

export const verifyTransporter = async (): Promise<boolean> => {
  try {
    await getTransporter().verify();
    logger.info('SMTP transporter verified');
    return true;
  } catch (error) {
    logger.warn({ error }, 'SMTP transporter verification failed');
    return false;
  }
};

export const fromAddress = (): string =>
  `"${config.email.fromName}" <${config.email.fromEmail || config.email.user}>`;
