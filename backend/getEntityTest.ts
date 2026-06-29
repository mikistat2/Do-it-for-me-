import { getTelegramClient } from './src/telegram/telegramClient';

async function main() {
  try {
    const client = await getTelegramClient();
    const entity = await client.getEntity('https://t.me/freelance_ethio');
    console.log("Channel ID:", entity.id.toString());
    const entity2 = await client.getEntity('https://t.me/freelancers_ethiopia'); // Or some group
    console.log("Group ID:", entity2?.id?.toString());
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

main();
