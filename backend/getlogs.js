const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.log.findMany({
  orderBy: { createdAt: 'desc' },
  take: 10
}).then(logs => {
  console.log(JSON.stringify(logs, null, 2));
}).finally(() => {
  prisma.$disconnect();
});
