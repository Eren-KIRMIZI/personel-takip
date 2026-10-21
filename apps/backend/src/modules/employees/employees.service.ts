import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import { CreateEmployeeDto, EmployeeListQueryDto, UpdateEmployeeDto } from './dto/employees.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeEntityScopedWhere, getScope } from '../../common/scope';

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
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);

    const base: Record<string, unknown> = {};
    if (query.search) {
      base.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeNo: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { internalPhone: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { title: { name: { contains: query.search, mode: 'insensitive' } } },
        { position: { name: { contains: query.search, mode: 'insensitive' } } },
        { department: { name: { contains: query.search, mode: 'insensitive' } } },
        { unit: { name: { contains: query.search, mode: 'insensitive' } } },
        { workLocation: { name: { contains: query.search, mode: 'insensitive' } } },
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

  async find(id: string, actor?: AuthenticatedUser) {
    if (actor) {
      const scope = getScope(actor);
      if (scope.kind === 'self' && actor.employeeId !== id) {
        throw new ForbiddenException('Yalnızca kendi personel detayınızı görüntüleyebilirsiniz.');
      }
    }

    const cacheKey = CacheKeys.employeeDetail(id);
    const cached = await this.cache.get<any>(cacheKey);
    let employee = cached;

    if (!employee) {
      employee = await this.prisma.employee.findUnique({
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
    }

    if (actor) {
      const scope = getScope(actor);
      if (scope.kind === 'department' && employee.departmentId !== scope.departmentId) {
        throw new ForbiddenException('Bu personelin detaylarını görüntüleme yetkiniz yok (Farklı departman).');
      }
    }

    return employee;
  }

  async history(id: string, actor?: AuthenticatedUser) {
    if (actor) {
      const scope = getScope(actor);
      if (scope.kind === 'self' && actor.employeeId !== id) {
        throw new ForbiddenException('Yalnızca kendi geçmiş kayıtlarınızı görüntüleyebilirsiniz.');
      }
    }

    const employee = await this.prisma.employee.findUnique({ where: { id }, select: { id: true, departmentId: true } });
    if (!employee) {
      throw new NotFoundException('Personel bulunamadı.');
    }

    if (actor) {
      const scope = getScope(actor);
      if (scope.kind === 'department' && employee.departmentId !== scope.departmentId) {
        throw new ForbiddenException('Bu personelin geçmiş kayıtlarını görüntüleme yetkiniz yok (Farklı departman).');
      }
    }

    const cacheKey = CacheKeys.employeeHistory(id);
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    });
    await this.cache.set(cacheKey, result, CacheTTL.EMPLOYEE_DETAIL);
    return result;
  }

  async create(dto: CreateEmployeeDto, actor: { userId: string; ip?: string; userAgent?: string }) {
    const { account, ...raw } = dto;
    const profile = this.parseDateFields(raw);

    let createdEmployee;

    if (account?.password && (account?.email || account?.username)) {
      const email = account.email ?? profile.email ?? `${account.username}@kurum.local`;
      const username =
        account.username ??
        (account.email ? account.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_') : 'user');
      const fullName = `${profile.firstName} ${profile.lastName}`;
      const { authId } = await this.supabase.createAuthUser(email, account.password, fullName);

      try {
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
        await this.createInitialHistory(this.prisma, createdEmployee.id, raw);
      } catch (prismaError) {
        // Prisma işlemi başarısız olduysa Supabase auth kullanıcısını geri al
        try {
          await this.supabase.deleteAuthUser(authId);
        } catch (supabaseRollbackError) {
          console.error('Supabase auth rollback başarısız:', supabaseRollbackError);
        }
        throw new InternalServerErrorException(
          `Personel oluşturma başarısız: ${(prismaError as Error).message}`,
        );
      }
    } else {
      createdEmployee = await this.prisma.employee.create({
        data: { ...profile },
        include: employeeInclude,
      });
      await this.createInitialHistory(this.prisma, createdEmployee.id, raw);
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

  /** YYYY-MM-DD veya ISO string tarih alanlarını Date nesnesine çevirir */
  private parseDateFields<T extends Record<string, unknown>>(obj: T): T {
    const dateFields = ['workStartDate', 'workEndDate', 'birthDate'] as const;
    const result = { ...obj } as Record<string, unknown>;
    for (const field of dateFields) {
      const val = result[field];
      if (typeof val === 'string' && val.trim()) {
        result[field] = new Date(val);
      }
    }
    return result as T;
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

    const { roleIds, account: _account, ...raw } = dto;
    const profile = this.parseDateFields(raw);

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

  async delete(
    id: string,
    actor: { userId: string; ip?: string; userAgent?: string },
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!employee) {
      throw new NotFoundException('Personel bulunamadı.');
    }

    // Supabase Auth kullanıcısını sil
    if (employee.user?.authId) {
      try {
        await this.supabase.deleteAuthUser(employee.user.authId);
      } catch (err) {
        console.error('Supabase auth kullanıcısı silinemedi:', err);
      }
    }

    // Transaction operasyonlarını (tek bir veritabanı turu ile çalıştırmak için) diziye topla
    const txOperations: any[] = [];

    // Audit logları — employeeId FK
    txOperations.push(this.prisma.auditLog.updateMany({ where: { employeeId: id }, data: { employeeId: null } }));

    // User kaydını önce kaldır (employee silinmeden)
    if (employee.user) {
      const userId = employee.user.id;
      // User'a referans veren alanları temizle (FK constraint hatasını önlemek için)
      txOperations.push(this.prisma.auditLog.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } }));
      txOperations.push(this.prisma.advance.updateMany({ where: { approvedById: userId }, data: { approvedById: null } }));
      txOperations.push(this.prisma.bonus.updateMany({ where: { approvedById: userId }, data: { approvedById: null } }));
      txOperations.push(this.prisma.employeeRecord.updateMany({ where: { issuedById: userId }, data: { issuedById: null } }));

      txOperations.push(this.prisma.userRole.deleteMany({ where: { userId } }));
      txOperations.push(this.prisma.user.delete({ where: { id: userId } }));
    }

    // İlişkili tüm veriler
    txOperations.push(this.prisma.employeeHistory.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.leaveRequest.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.overtime.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.attendanceRecord.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.shiftAssignment.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.payrollItem.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.advance.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.bonus.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.employeeRecord.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.asset.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.task.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.document.updateMany({ where: { employeeId: id }, data: { employeeId: null } }));
    txOperations.push(this.prisma.announcementEmployee.deleteMany({ where: { employeeId: id } }));
    txOperations.push(this.prisma.announcementRead.deleteMany({ where: { employeeId: id } }));

    // Alt personellerin yönetici bağını kaldır
    txOperations.push(this.prisma.employee.updateMany({ where: { managerId: id }, data: { managerId: null } }));

    // Personeli sil
    txOperations.push(this.prisma.employee.delete({ where: { id } }));

    // Tek bir seferde çalıştır
    await this.prisma.$transaction(txOperations);

    // Audit log (transaction dışında — personel zaten silindi)
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'employee.delete',
      entityType: 'employee',
      entityId: id,
      before: employee,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });

    // Cache'i temizle
    await Promise.all([
      this.cache.del(CacheKeys.employeeDetail(id), CacheKeys.employeeHistory(id)),
      this.cache.delByPrefix(CacheKeys.employeeListPrefix()),
    ]);

    return { success: true };
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