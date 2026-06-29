import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@jobbot.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      profile: {
        create: {
          fullName: 'JobBot Admin',
          email,
          skills: ['TypeScript', 'Node.js', 'Vue'],
          preferredRoles: ['Full Stack Engineer', 'Backend Engineer'],
          preferredLocations: ['Remote'],
          minMatchScore: 70,
        },
      },
      settings: {
        create: {
          automationPaused: true,
          autoApply: false,
          matchThreshold: 75,
        },
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${user.email} (password: ${password})`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
