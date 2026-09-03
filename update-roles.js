const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.role.updateMany({
    where: { code: { not: 'ADMIN' } },
    data: { isSystem: false }
  });
  console.log('Updated roles');
}
main().catch(console.error).finally(() => prisma.$disconnect());
