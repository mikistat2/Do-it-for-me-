const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.telegramChannel.findMany();
  console.log(JSON.stringify(channels, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
