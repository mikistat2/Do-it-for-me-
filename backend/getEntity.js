const { getTelegramClient } = require('./src/telegram/telegramClient');

async function main() {
  try {
    const client = await getTelegramClient();
    const entity = await client.getEntity('https://t.me/freelance_ethio');
    console.log("ID:", entity.id.toString());
    console.log("Username:", entity.username);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

main();
