import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recentLogs = await prisma.log.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    where: { category: 'TELEGRAM' }
  });
  
  console.log("RECENT TELEGRAM LOGS:");
  recentLogs.forEach((l: any) => console.log(`[${l.createdAt.toISOString()}] ${l.level}: ${l.message} - ${JSON.stringify(l.context)}`));
  
  const recentJobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("\nRECENT JOBS:");
  recentJobs.forEach(j => console.log(`[${j.createdAt.toISOString()}] ${j.title} - ${j.status}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
