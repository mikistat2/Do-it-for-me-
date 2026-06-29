import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getTelegramClient } from './src/telegram/telegramClient';
import { fetchChannelHistory } from './src/telegram/telegramMonitor';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('=== Channel Cleanup & History Fetch ===\n');

  // 1. Delete stale URL-based channel records
  const staleChannels = await prisma.telegramChannel.findMany({
    where: {
      channelId: { startsWith: 'http' },
    },
  });

  if (staleChannels.length > 0) {
    console.log(`Found ${staleChannels.length} stale URL-based channel(s):`);
    for (const ch of staleChannels) {
      console.log(`  - "${ch.title}" (channelId: ${ch.channelId})`);
      await prisma.telegramChannel.delete({ where: { id: ch.id } });
      console.log(`    ✓ Deleted`);
    }
  } else {
    console.log('No stale URL-based channels found.');
  }

  // 2. Fetch history for all remaining ACTIVE channels
  const activeChannels = await prisma.telegramChannel.findMany({
    where: { status: 'ACTIVE' },
  });

  if (activeChannels.length === 0) {
    console.log('\nNo active channels to sync.');
    return;
  }

  console.log(`\nFetching history for ${activeChannels.length} active channel(s)...\n`);

  // Connect Telegram client
  await getTelegramClient();
  console.log('Telegram client connected.\n');

  for (const channel of activeChannels) {
    const entityRef = channel.username || channel.channelId;
    console.log(`Syncing: "${channel.title}" (entity: ${entityRef})...`);
    try {
      const result = await fetchChannelHistory(
        channel.id,
        channel.userId,
        entityRef,
        100,
      );
      console.log(`  ✓ Processed ${result.processed} messages, found ${result.jobs} job(s)\n`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed: ${msg}`);
    }
  }

  console.log('=== Done ===');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
