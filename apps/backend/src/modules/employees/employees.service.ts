import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import { CreateEmployeeDto, EmployeeListQueryDto, UpdateEmployeeDto } from './dto/employees.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeEntityScopedWhere } from '../../common/scope';

// Listede kullanılan hafif include — user/roles JOIN'i yok
const listInclude = {
  department: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  workLocation: { select: { id: true, name: true } },
  title: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
} as const;

// Detay/yazma işlemlerinde kullanılan tam include
const employeeInclude = {
  department: true,
  unit: true,
  workLocation: true,
  title: true,
  position: true,
  manager: { select: { id: true, firstName: true, lastName: true } },
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      roles: { select: { role: { select: { id: true, name: true, code: true } } } },
    },
  },
} as const;

const ASSIGNMENT_FIELDS = [
  'departmentId',
  'unitId',
  'workLocationId',
  'titleId',
  'positionId',
] as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async list(query: EmployeeListQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const base: Record<string, unknown> = {};
    if (query.search) {
      base.OR = [
        { firstName: { startsWith: query.search, mode: 'insensitive' } },
        { lastName: { startsWith: query.search, mode: 'insensitive' } },
        { employeeNo: { startsWith: query.search, mode: 'insensitive' } },
        { email: { startsWith: query.search, mode: 'insensitive' } },
        { internalPhone: { startsWith: query.search, mode: 'insensitive' } },
        { phone: { startsWith: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.departmentId) base.departmentId = query.departmentId;
    if (query.unitId) base.unitId = query.unitId;
    if (query.workLocationId) base.workLocationId = query.workLocationId;
    if (query.titleId) base.titleId = query.titleId;
    if (query.status) base.status = query.status;

    const where = employeeEntityScopedWhere(actor, base);

    // Arama sorgularını cache'leme — sadece filtresiz listeler
    const cacheKey = CacheKeys.employeeList({ ...query, page, pageSize, actorId: actor.userId });
    if (!query.search) {
      const cached = await this.cache.get<{ items: unknown[]; total: number; page: number; pageSize: number }>(cacheKey);
      if (cached) return cached;
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: listInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    const result = { items, total, page, pageSize };
    if (!query.search) {
      await this.cache.set(cacheKey, result, CacheTTL.EMPLOYEE_LIST);
    }
    return result;
  }

  async find(id: string) {
    const cacheKey = CacheKeys.employeeDetail(id);
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        ...employeeInclude,
        history: {
          orderBy: { effectiveDate: 'desc' },
          take: 50,
        },
      },
    });
    if (!employee) {
      throw new NotFoundException('Personel bulunamadı.');
    }
    await this.cache.set(cacheKey, employee, CacheTTL.EMPLOYEE_DETAIL);
    return employee;
  }

  async history(id: string) {
    const cacheKey = CacheKeys.employeeHistory(id);
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const employee = await this.prisma.employee.findUnique({ where: { id }, select: { id: true } });
    if (!employee) {
      throw new NotFoundException('Personel bulunamadı.');
    }
    const result = await this.prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    });
    await this.cache.set(cacheKey, result, CacheTTL.EMPLOYEE_DETAIL);
    return result;
  }

  async create(dto: CreateEmployeeDto, actor: { userId: string; ip?: string; userAgent?: string }) {
    const { account, ...profile } = dto;

    let createdEmployee;

    if (account?.password && (account?.email || account?.username)) {
      const email = account.email ?? profile.email ?? `${account.username}@kurum.local`;
      const username =
        account.username ??
        (account.email ? account.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_') : 'user');
      const fullName = `${profile.firstName} ${profile.lastName}`;
      const { authId } = await this.supabase.createAuthUser(email, account.password, fullName);

      createdEmployee = await this.prisma.employee.create({
        data: {
          ...profile,
          user: {
            create: {
              authId,
              username,
              email,
              status: 'ACTIVE',
              roles: account.roleIds?.length
                ? { create: account.roleIds.map((roleId) => ({ roleId })) }
                : undefined,
            },
          },
        },
        include: employeeInclude,
      });
      await this.createInitialHistory(this.prisma, createdEmployee.id, profile);
    } else {
      createdEmployee = await this.prisma.employee.create({
        data: { ...profile },
        include: employeeInclude,
      });
      await this.createInitialHistory(this.prisma, createdEmployee.id, profile);
    }

    await this.audit.log({
      actorUserId: actor.userId,
      action: 'employee.create',
      entityType: 'employee',
      entityId: createdEmployee.id,
      after: profile,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });

    // Personel listesi cache'ini temizle (yeni personel eklendi)
    await this.cache.delByPrefix(CacheKeys.employeeListPrefix());

    return createdEmployee;
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    actor: { userId: string; ip?: string; userAgent?: string },
  ) {
    const before = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: { include: { roles: true } } },
    });
    if (!before) {
      throw new NotFoundException('Personel bulunamadı.');
    }

    const { roleIds, ...profile } = dto;

    const historyEntries: Prisma.EmployeeHistoryCreateManyInput[] = ASSIGNMENT_FIELDS.filter(
      (field) => profile[field] !== undefined && profile[field] !== before[field],
    ).map((field) => ({
      employeeId: id,
      [field]: profile[field] ?? null,
      changeType: `${field.replace('Id', '').replace(/([a-z])([A-Z])/g, '$1.$2')}.change`,
      effectiveDate: new Date(),
      note: 'Personel güncelleme',
      createdById: actor.userId,
    }));

    const updated = await this.prisma.$transaction(async (tx) => {
      if (historyEntries.length) {
        await tx.employeeHistory.createMany({ data: historyEntries });
      }
      if (roleIds && before.user) {
        await tx.userRole.deleteMany({ where: { userId: before.user.id } });
        if (roleIds.length) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ roleId, userId: before.user!.id })),
          });
        }
      }
      return tx.employee.update({
        where: { id },
        data: profile,
        include: employeeInclude,
      });
    });

    await this.audit.log({
      actorUserId: actor.userId,
      action: 'employee.update',
      entityType: 'employee',
      entityId: id,
      before,
      after: updated,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });

    // Hem detay hem de liste cache'ini temizle
    await Promise.all([
      this.cache.del(CacheKeys.employeeDetail(id), CacheKeys.employeeHistory(id)),
      this.cache.delByPrefix(CacheKeys.employeeListPrefix()),
    ]);

    return updated;
  }

  async setStatus(
    id: string,
    status: 'ACTIVE' | 'PASSIVE' | 'SUSPENDED',
    actor: { userId: string; ip?: string; userAgent?: string },
  ) {
    const before = await this.prisma.employee.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('Personel bulunamadı.');
    }
    const data =
      status === 'PASSIVE' && !before.workEndDate
        ? { status, workEndDate: new Date() }
        : { status };
    const updated = await this.prisma.employee.update({ where: { id }, data, include: employeeInclude });
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'employee.status',
      entityType: 'employee',
      entityId: id,
      before,
      after: updated,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });

    // Durum değişince detay + liste cache'ini temizle
    await Promise.all([
      this.cache.del(CacheKeys.employeeDetail(id)),
      this.cache.delByPrefix(CacheKeys.employeeListPrefix()),
    ]);

    return updated;
  }

  private createInitialHistory(
    tx: Prisma.TransactionClient,
    employeeId: string,
    profile: Pick<
      CreateEmployeeDto,
      'departmentId' | 'unitId' | 'workLocationId' | 'titleId' | 'positionId'
    >,
  ) {
    const entries: Prisma.EmployeeHistoryCreateManyInput[] = ASSIGNMENT_FIELDS.filter((field) =>
      profile[field],
    ).map((field) => ({
      employeeId,
      [field]: profile[field]!,
      changeType: 'initial.assignment',
      effectiveDate: new Date(),
    }));
    if (!entries.length) return Promise.resolve();
    return tx.employeeHistory.createMany({ data: entries });
  }
}