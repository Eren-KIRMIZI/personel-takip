import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  // Find admin role
  let adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: 'Admin', code: 'admin', isSystem: true }
    });
  }

  // Get all permissions
  const permissions = await prisma.permission.findMany();
  
  // Assign all permissions to Admin
  for (const perm of permissions) {
    const existing = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: perm.id }
    });
    if (!existing) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: perm.id }
      });
    }
  }
  console.log(`Assigned ${permissions.length} permissions to Admin role.`);

  // Assign Admin role to users
  const emails = ['admin@belediye.local', 'yonetici@belediye.local', 'ik@belediye.local', 'personel@belediye.local'];
  
  for (const email of emails) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.log(`User ${email} not found.`);
      continue;
    }

    const existingLink = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: adminRole.id }
    });

    if (!existingLink) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: adminRole.id }
      });
      console.log(`Assigned Admin role to ${email}`);
    } else {
      console.log(`${email} already has Admin role.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
