import { prisma } from './src/lib/prisma';

async function check() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.length);
  const wa = await prisma.waSession.findMany();
  console.log("WaSessions:", wa.length);
}
check().catch(console.error).finally(() => prisma.$disconnect());
