import readline from 'readline';
import { TelegramClient } from '../../node_modules/telegram';
import { StringSession } from '../../node_modules/telegram/sessions';
import { config } from '../config';
import { loadSession, saveSession } from './session';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const prompt = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const readInput = async (promptMsg: string, fileName: string): Promise<string> => {
  console.log(promptMsg);
  const filePath = path.join(__dirname, '..', '..', fileName);
  while (!fs.existsSync(filePath)) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  const val = fs.readFileSync(filePath, 'utf8').trim();
  fs.unlinkSync(filePath);
  return val;
};

export const runTelegramLogin = async (): Promise<void> => {
  if (!config.telegram.apiId || !config.telegram.apiHash) {
    throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set');
  }

  const client = new TelegramClient(
    new StringSession(loadSession()),
    config.telegram.apiId,
    config.telegram.apiHash,
    { connectionRetries: 5 },
  );

  await client.start({
    phoneNumber: async () =>
      process.env.TELEGRAM_PHONE || prompt('Enter your phone number: '),
    password: async () => readInput('Enter your 2FA password (if any): ', 'password.txt'),
    phoneCode: async () => readInput('Enter the code you received: ', 'code.txt'),
    onError: (err: Error) => logger.error({ err }, 'Telegram login error'),
  });

  const session = client.session.save();
  if (typeof session === 'string') {
    saveSession(session);
    logger.info('Telegram login successful. Session saved.');
  }
  await client.disconnect();
};

if (require.main === module) {
  runTelegramLogin()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ error }, 'Telegram login failed');
      process.exit(1);
    });
}
