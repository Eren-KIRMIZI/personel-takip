import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdvanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AdvanceListQueryDto, CreateAdvanceDto, RejectAdvanceDto } from './dto/advance.dto';

const advanceInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
  approvedBy: { select: { id: true, username: true } },
} as const;

@Injectable()
export class AdvanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdvanceListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AdvanceWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.periodYear) where.periodYear = query.periodYear;
    if (query.periodMonth) where.periodMonth = query.periodMonth;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.advance.findMany({
        where,
        include: advanceInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.advance.count({ where }),
    ]);
    return { items: items.map(this.mapVisibility), total, page, pageSize };
  }

  private mapVisibility(item: Prisma.AdvanceGetPayload<{ include: typeof advanceInclude }>) {
    return { ...item, amount: Number(item.amount) };
  }

  async create(dto: CreateAdvanceDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Geçersiz avans tutarı.');

    const now = new Date();
    const periodYear = dto.periodYear ?? now.getFullYear();
    const periodMonth = dto.periodMonth ?? now.getMonth() + 1;

    const item = await this.prisma.advance.create({
      data: {
        employeeId: dto.employeeId,
        amount: amount.toFixed(2),
        installmentCount: dto.installmentCount ?? 1,
        periodYear,
        periodMonth,
        description: dto.description ?? null,
      },
      include: advanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'advance.create',
      entityType: 'advance',
      entityId: item.id,
      after: { employeeId: dto.employeeId, amount, periodYear, periodMonth },
    });
    return this.mapVisibility(item);
  }

  async approve(id: string, actorUserId: string) {
    const item = await this.prisma.advance.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Avans kaydı bulunamadı.');
    if (item.status !== AdvanceStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen avans onaylanabilir.');
    }
    const updated = await this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.APPROVED, approvedById: actorUserId, approvedAt: new Date() },
      include: advanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'advance.approve',
      entityType: 'advance',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }

  async reject(id: string, dto: RejectAdvanceDto, actorUserId: string) {
    const item = await this.prisma.advance.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Avans kaydı bulunamadı.');
    if (item.status !== AdvanceStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen avans reddedilebilir.');
    }
    const updated = await this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.REJECTED, rejectionReason: dto.rejectionReason, approvedById: actorUserId, approvedAt: new Date() },
      include: advanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'advance.reject',
      entityType: 'advance',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }

  async markPaid(id: string, actorUserId: string) {
    const item = await this.prisma.advance.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Avans kaydı bulunamadı.');
    if (item.status !== AdvanceStatus.APPROVED) {
      throw new BadRequestException('Yalnızca onaylı avans ödendi işaretlenebilir.');
    }
    const updated = await this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.PAID, paymentDate: new Date() },
      include: advanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'advance.paid',
      entityType: 'advance',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }

  async cancel(id: string, actorUserId: string) {
    const item = await this.prisma.advance.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Avans kaydı bulunamadı.');
    if (item.status !== AdvanceStatus.PENDING && item.status !== AdvanceStatus.APPROVED) {
      throw new BadRequestException('Bu durumdaki avans iptal edilemez.');
    }
    const updated = await this.prisma.advance.update({
      where: { id },
      data: { status: AdvanceStatus.CANCELLED },
      include: advanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'advance.cancel',
      entityType: 'advance',
      entityId: id,
      before: item,
      after: updated,
    });
    return this.mapVisibility(updated);
  }
}