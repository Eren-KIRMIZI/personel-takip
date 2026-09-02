import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateBonusDto, UpdateBonusDto, UpdateBonusStatusDto, BonusListQueryDto } from './dto/bonus.dto';
import { BonusStatus } from '@prisma/client';

@Injectable()
export class BonusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private includeEmployee = {
    employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
    approvedBy: { select: { id: true, employee: { select: { firstName: true, lastName: true } } } },
  };

  async list(query: BonusListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.bonus.findMany({
        where,
        include: this.includeEmployee,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bonus.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async find(id: string) {
    const item = await this.prisma.bonus.findUnique({ where: { id }, include: this.includeEmployee });
    if (!item) throw new NotFoundException('Prim kaydı bulunamadı.');
    return item;
  }

  async create(dto: CreateBonusDto, actorUserId: string) {
    const item = await this.prisma.bonus.create({
      data: {
        employeeId: dto.employeeId,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
        note: dto.note,
        status: BonusStatus.PENDING,
      },
      include: this.includeEmployee,
    });

    await this.audit.log({
      actorUserId,
      action: 'bonus.create',
      entityType: 'bonus',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(id: string, dto: UpdateBonusDto, actorUserId: string) {
    const existing = await this.find(id);
    const updated = await this.prisma.bonus.update({
      where: { id },
      data: {
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        description: dto.description,
        note: dto.note,
      },
      include: this.includeEmployee,
    });

    await this.audit.log({
      actorUserId,
      action: 'bonus.update',
      entityType: 'bonus',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async updateStatus(id: string, dto: UpdateBonusStatusDto, actorUserId: string) {
    const existing = await this.find(id);
    
    const extra: any = {};
    if (dto.status === BonusStatus.APPROVED) {
      extra.approvedById = actorUserId;
      extra.approvedAt = new Date();
    } else if (dto.status === BonusStatus.REJECTED) {
      extra.rejectionReason = dto.rejectionReason;
    } else if (dto.status === BonusStatus.PAID) {
      extra.paymentDate = new Date();
    }

    const updated = await this.prisma.bonus.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        ...extra,
      },
      include: this.includeEmployee,
    });

    await this.audit.log({
      actorUserId,
      action: 'bonus.status',
      entityType: 'bonus',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.find(id);
    await this.prisma.bonus.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'bonus.delete',
      entityType: 'bonus',
      entityId: id,
      before: existing,
    });
    return { id, deleted: true };
  }

  async getStats() {
    const statusCounts = await this.prisma.bonus.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const total = await this.prisma.bonus.count();
    return {
      total,
      byStatus: statusCounts.map(s => ({ status: s.status, count: s._count.id })),
    };
  }
}
