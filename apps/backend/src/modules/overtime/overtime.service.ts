import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OvertimeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import { CreateOvertimeDto, OvertimeListQueryDto } from './dto/overtime.dto';

const overtimeInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
} as const;

@Injectable()
export class OvertimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: OvertimeListQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const base: Prisma.OvertimeWhereInput = {};
    if (query.status) base.status = query.status;
    if (query.employeeId) base.employeeId = query.employeeId;
    if (query.from || query.to) {
      base.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const where = employeeScopedWhere(actor, base);

    const [items, total] = await Promise.all([
      this.prisma.overtime.findMany({
        where,
        include: overtimeInclude,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.overtime.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async find(id: string) {
    const overtime = await this.prisma.overtime.findUnique({ where: { id }, include: overtimeInclude });
    if (!overtime) throw new NotFoundException('Mesai kaydı bulunamadı.');
    return overtime;
  }

  async create(dto: CreateOvertimeDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    if (dto.hours <= 0) throw new BadRequestException('Süre pozitif olmalıdır.');

    const overtime = await this.prisma.overtime.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: dto.hours,
        rate: dto.rate ?? 1,
        description: dto.description ?? null,
      },
      include: overtimeInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'overtime.create',
      entityType: 'overtime',
      entityId: overtime.id,
      after: overtime,
    });
    return overtime;
  }

  async approve(id: string, actorUserId: string) {
    const before = await this.ensure(id);
    if (before.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen kayıtlar onaylanabilir.');
    }
    const updated = await this.prisma.overtime.update({
      where: { id },
      data: { status: OvertimeStatus.APPROVED, approvedById: actorUserId, approvedAt: new Date() },
      include: overtimeInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'overtime.approve',
      entityType: 'overtime',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async reject(id: string, reason: string, actorUserId: string) {
    const before = await this.ensure(id);
    if (before.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen kayıtlar reddedilebilir.');
    }
    const updated = await this.prisma.overtime.update({
      where: { id },
      data: { status: OvertimeStatus.REJECTED, rejectionReason: reason },
      include: overtimeInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'overtime.reject',
      entityType: 'overtime',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async cancel(id: string, actorUserId: string) {
    const before = await this.ensure(id);
    if (before.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen kayıtlar iptal edilebilir.');
    }
    const updated = await this.prisma.overtime.update({
      where: { id },
      data: { status: OvertimeStatus.CANCELLED },
      include: overtimeInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'overtime.cancel',
      entityType: 'overtime',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  private async ensure(id: string) {
    const overtime = await this.prisma.overtime.findUnique({ where: { id }, include: overtimeInclude });
    if (!overtime) throw new NotFoundException('Mesai kaydı bulunamadı.');
    return overtime;
  }
}