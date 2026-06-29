import { getTelegramClient } from './src/telegram/telegramClient';
import { NewMessage } from 'telegram/events';
import { Api } from 'telegram';

const resolveChatId = (event: any): string | null => {
  const message = event.message;
  const peer = message.peerId;
  if (peer instanceof Api.PeerChannel) {
    return (peer as any).channelId.toString();
  }
  if (peer instanceof Api.PeerChat) {
    return (peer as any).chatId.toString();
  }
  if (message.chatId) {
    return message.chatId.toString();
  }
  return null;
};

async function main() {
  try {
    const client = await getTelegramClient();
    client.addEventHandler(async (event) => {
      const chatId = resolveChatId(event);
      console.log('Message from chatId:', chatId, 'peerId:', event.message.peerId.className);
    }, new NewMessage({}));
    console.log('Listening for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

main();
