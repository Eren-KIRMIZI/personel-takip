import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmploymentStatus, PayrollStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere, resolveScopeKind } from '../../common/scope';
import { CreatePayrollDto, PayrollListQueryDto, SetSalaryDto, UpdatePayrollDto } from './dto/payroll.dto';

const payrollInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNum(v: string | number | Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v.toString());
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private periodBounds(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
  }

  async list(query: PayrollListQueryDto, actor: AuthenticatedUser) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);
    const base: Prisma.PayrollItemWhereInput = {};
    if (query.employeeId) base.employeeId = query.employeeId;
    if (query.periodYear) base.periodYear = query.periodYear;
    if (query.periodMonth) base.periodMonth = query.periodMonth;
    if (query.status) base.status = query.status;

    const where = employeeScopedWhere(actor, base);

    const [items, total] = await Promise.all([
      this.prisma.payrollItem.findMany({
        where,
        include: payrollInclude,
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { employee: { firstName: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payrollItem.count({ where }),
    ]);
    return { items: items.map(this.mapVisibility), total, page, pageSize };
  }

  private mapVisibility(item: Prisma.PayrollItemGetPayload<{ include: typeof payrollInclude }>) {
    return {
      ...item,
      baseSalary: Number(item.baseSalary),
      overtimeAmount: Number(item.overtimeAmount),
      leaveDeduction: Number(item.leaveDeduction),
      bonus: item.bonus == null ? null : Number(item.bonus),
      deduction: item.deduction == null ? null : Number(item.deduction),
      grossAmount: Number(item.grossAmount),
      netAmount: Number(item.netAmount),
    };
  }

  async getEmployeeSalary(employeeId: string, actor: AuthenticatedUser) {
    const scopeKind = resolveScopeKind(actor);
    const isHrOrAdmin = scopeKind === 'all';
    if (!isHrOrAdmin && actor.employeeId !== employeeId) {
      throw new ForbiddenException('Yalnızca kendi maaş bilginizi görüntüleyebilirsiniz.');
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    const last = await this.prisma.payrollItem.findFirst({
      where: { employeeId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    return { baseSalary: last ? Number(last.baseSalary) : null, lastPeriod: last ? { year: last.periodYear, month: last.periodMonth } : null };
  }

  async setSalary(employeeId: string, dto: SetSalaryDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    const base = Number(dto.baseSalary);
    if (!Number.isFinite(base) || base <= 0) throw new BadRequestException('Geçersiz maaş tutarı.');

    // Maası tampon olarak mevcut kayıtların baseSalary'ine işle (yeni aylara taşınır).
    const current = this.periodNow();
    const item = await this.prisma.payrollItem.upsert({
      where: { employeeId_periodYear_periodMonth: { employeeId, periodYear: current.year, periodMonth: current.month } },
      update: { baseSalary: dto.baseSalary, note: dto.note ?? null },
      create: {
        employeeId,
        periodYear: current.year,
        periodMonth: current.month,
        baseSalary: dto.baseSalary,
        grossAmount: dto.baseSalary,
        netAmount: dto.baseSalary,
        note: dto.note ?? null,
      },
      include: payrollInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'payroll.setsalary',
      entityType: 'payroll_item',
      entityId: item.id,
      after: { employeeId, baseSalary: base },
    });
    return this.mapVisibility(item);
  }

  private periodNow() {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  async generate(dto: CreatePayrollDto, actorUserId: string) {
    const { periodYear, periodMonth } = dto;
    const { start, end } = this.periodBounds(periodYear, periodMonth);

    const employees = await this.prisma.employee.findMany({
      where: { status: EmploymentStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true },
    });

    const existing = await this.prisma.payrollItem.findMany({
      where: { periodYear, periodMonth },
      select: { employeeId: true, baseSalary: true },
    });
    const baseByEmployee = new Map(existing.map((e) => [e.employeeId, Number(e.baseSalary)]));

    // Son bilinen maaşı bul (önceki dönemlerden)
    const result: Array<{ id: string; baseSalary: number; overtimeAmount: number; leaveDeduction: number; grossAmount: number; netAmount: number }> = [];

    for (const emp of employees) {
      const baseSalary = baseByEmployee.get(emp.id);

      const [overtimeAgg, unpaidLeaveAgg] = await Promise.all([
        this.prisma.overtime.aggregate({
          where: { employeeId: emp.id, status: 'APPROVED', date: { gte: start, lte: end } },
          _sum: { hours: true },
        }),
        this.prisma.leaveRequest.aggregate({
          where: {
            employeeId: emp.id,
            status: 'APPROVED',
            startDate: { lte: end },
            endDate: { gte: start },
            leaveType: { isNot: { paid: true } },
          },
          _sum: { days: true },
        }),
      ]);

      const otHours = toNum(overtimeAgg._sum.hours);
      const unpaidDays = toNum(unpaidLeaveAgg._sum.days);

      // Maas yoksa hesaplamasız, sadece kayıt doğma olsun
      const base = baseSalary ?? 0;
      // Mesai: 1 saatlik ödeme = (aylıık brüt / 30 gün / 8 saat); toplam
      const gross = base;
      const overtimeAmount = base > 0 ? round2(((base / 30 / 8) * otHours)) : 0;
      const leaveDeduction = base > 0 ? round2(((base / 30) * unpaidDays)) : 0;
      const calcGross = round2(gross + overtimeAmount - leaveDeduction);

      result.push({ id: emp.id, baseSalary: base, overtimeAmount, leaveDeduction, grossAmount: calcGross, netAmount: calcGross });
    }

    // Kaydet (upsert per employee in period)
    await this.prisma.$transaction(
      result.map((r) =>
        this.prisma.payrollItem.upsert({
          where: {
            employeeId_periodYear_periodMonth: { employeeId: r.id, periodYear, periodMonth },
          },
          update: { grossAmount: r.grossAmount, netAmount: r.netAmount },
          create: {
            employeeId: r.id,
            periodYear,
            periodMonth,
            baseSalary: r.baseSalary,
            overtimeAmount: r.overtimeAmount,
            leaveDeduction: r.leaveDeduction,
            grossAmount: r.grossAmount,
            netAmount: r.netAmount,
          },
        }),
      ),
    );

    await this.audit.log({
      actorUserId,
      action: 'payroll.generate',
      entityType: 'payroll',
      entityId: `${periodYear}-${periodMonth}`,
      after: { periodYear, periodMonth, employeeCount: employees.length },
    });

    const list = await this.prisma.payrollItem.findMany({
      where: { periodYear, periodMonth },
      include: payrollInclude,
      orderBy: { employee: { firstName: 'asc' } },
    });
    return { periodYear, periodMonth, items: list.map(this.mapVisibility), generated: result.length };
  }

  async update(id: string, dto: UpdatePayrollDto, actorUserId: string) {
    const item = await this.prisma.payrollItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Bordro kaydı bulunamadı.');
    if (item.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Yalnızca taslak bordro düzenlenebilir.');
    }

    const base = Number(item.baseSalary);
    const ot = Number(item.overtimeAmount);
    const leaveD = Number(item.leaveDeduction);
    const bonus = dto.bonus != null ? Number(dto.bonus) : toNum(item.bonus);
    const deduction = dto.deduction != null ? Number(dto.deduction) : toNum(item.deduction);
    const gross = round2(base + ot - leaveD + bonus - deduction);

    const updated = await this.prisma.payrollItem.update({
      where: { id },
      data: {
        bonus: dto.bonus ?? item.bonus,
        deduction: dto.deduction ?? item.deduction,
        grossAmount: gross,
        netAmount: gross,
        note: dto.note ?? item.note,
      },
      include: payrollInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'payroll.update',
      entityType: 'payroll_item',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }

  async approve(id: string, actorUserId: string) {
    const item = await this.prisma.payrollItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Bordro kaydı bulunamadı.');
    if (item.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Yalnızca taslak onaylanabilir.');
    }
    const updated = await this.prisma.payrollItem.update({
      where: { id },
      data: { status: PayrollStatus.APPROVED, approvedAt: new Date() },
      include: payrollInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'payroll.approve',
      entityType: 'payroll_item',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }

  async markPaid(id: string, actorUserId: string) {
    const item = await this.prisma.payrollItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Bordro kaydı bulunamadı.');
    if (item.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Yalnızca onaylı bordro ödendi işaretlenebilir.');
    }
    const updated = await this.prisma.payrollItem.update({
      where: { id },
      data: { status: PayrollStatus.PAID },
      include: payrollInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'payroll.paid',
      entityType: 'payroll_item',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }
}