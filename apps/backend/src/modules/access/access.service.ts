import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys } from '../../common/cache/cache.keys';
import { CreateRoleDto, SetRolePermissionsDto, SetUserRolesDto, SetUserStatusDto, UpdateRoleDto } from './dto/access.dto';

const roleInclude = {
  permissions: {
    include: { permission: true },
  },
} as const;

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ------------------------------------------------------------
  // Yetkiler (permissions)
  // ------------------------------------------------------------

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, name: true, module: true, description: true },
    });
  }

  // ------------------------------------------------------------
  // Roller
  // ------------------------------------------------------------

  async listRoles(search?: string) {
    const where: Prisma.RoleWhereInput | undefined = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
      : undefined;
    const roles = await this.prisma.role.findMany({
      where,
      include: roleInclude,
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      isSystem: r.isSystem,
      isActive: r.isActive,
      createdAt: r.createdAt,
      permissions: r.permissions.map((p) => p.permission),
    }));
  }

  async createRole(dto: CreateRoleDto, actorUserId: string) {
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        permissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: roleInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'role.create',
      entityType: 'role',
      entityId: role.id,
      after: dto,
    });
    return this.serializeRole(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorUserId: string) {
    const before = await this.prisma.role.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Rol bulunamadı.');
    const role = await this.prisma.role.update({
      where: { id },
      data: dto,
      include: roleInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'role.update',
      entityType: 'role',
      entityId: id,
      before,
      after: role,
    });
    await this.cache.delByPrefix(CacheKeys.authPrefix());
    return this.serializeRole(role);
  }

  async setRolePermissions(id: string, dto: SetRolePermissionsDto, actorUserId: string) {
    const before = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!before) throw new NotFoundException('Rol bulunamadı.');

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      ...(dto.permissionIds.length
        ? [this.prisma.rolePermission.createMany({ data: dto.permissionIds.map((permissionId) => ({ permissionId, roleId: id })) })]
        : []),
    ]);

    const role = await this.prisma.role.findUnique({ where: { id }, include: roleInclude });
    await this.audit.log({
      actorUserId,
      action: 'role.permissions',
      entityType: 'role',
      entityId: id,
      before,
      after: { permissionIds: dto.permissionIds },
    });
    await this.cache.delByPrefix(CacheKeys.authPrefix());
    return this.serializeRole(role);
  }

  async removeRole(id: string, actorUserId: string) {
    const before = await this.prisma.role.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Rol bulunamadı.');
    if (before.isSystem) throw new NotFoundException('Sistem rolu silinemez.');
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'role.delete',
      entityType: 'role',
      entityId: id,
      before,
    });
    await this.cache.delByPrefix(CacheKeys.authPrefix());
    return { id };
  }

  // ------------------------------------------------------------
  // Kullanıcılar
  // ------------------------------------------------------------

  listUsers(search?: string) {
    const where: Prisma.UserWhereInput | undefined = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;
    return this.prisma.user.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        roles: { include: { role: true } },
      },
      orderBy: { username: 'asc' },
    });
  }

  async setUserRoles(userId: string, dto: SetUserRolesDto, actorUserId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException('Kullanıcı bulunamadı.');
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...(dto.roleIds.length
        ? [this.prisma.userRole.createMany({ data: dto.roleIds.map((roleId) => ({ roleId, userId })) })]
        : []),
    ]);
    await this.audit.log({
      actorUserId,
      action: 'user.roles',
      entityType: 'user',
      entityId: userId,
      before,
      after: { roleIds: dto.roleIds },
    });
    if (before.authId) {
      await this.cache.del(CacheKeys.authUser(before.authId));
    }
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        roles: { include: { role: true } },
      },
    });
  }

  async setUserStatus(userId: string, dto: SetUserStatusDto, actorUserId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException('Kullanıcı bulunamadı.');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        roles: { include: { role: true } },
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'user.status',
      entityType: 'user',
      entityId: userId,
      before,
      after: updated,
    });
    if (before.authId) {
      await this.cache.del(CacheKeys.authUser(before.authId));
    }
    return updated;
  }

  private serializeRole(role: any) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      createdAt: role.createdAt,
      permissions: role.permissions?.map((p: any) => p.permission) ?? [],
    };
  }
}