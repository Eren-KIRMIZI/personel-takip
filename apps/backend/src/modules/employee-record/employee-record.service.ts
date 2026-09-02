import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateEmployeeRecordDto, EmployeeRecordListQueryDto, UpdateEmployeeRecordDto } from './dto/employee-record.dto';

const recordInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
  issuedBy: { select: { id: true, username: true, employee: { select: { firstName: true, lastName: true } } } },
} as const;

@Injectable()
export class EmployeeRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: EmployeeRecordListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.EmployeeRecordWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.category) where.category = query.category;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.employeeRecord.findMany({
        where,
        include: recordInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employeeRecord.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async create(dto: CreateEmployeeRecordDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');

    if (dto.issuedById) {
      const issuer = await this.prisma.user.findUnique({ where: { id: dto.issuedById } });
      if (!issuer) throw new BadRequestException('Düzenleyen kullanıcı bulunamadı.');
    }

    const record = await this.prisma.employeeRecord.create({
      data: {
        employeeId: dto.employeeId,
        category: dto.category,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        date: new Date(dto.date),
        issuedById: dto.issuedById ?? null,
        note: dto.note ?? null,
      },
      include: recordInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'employee-record.create',
      entityType: 'employee_record',
      entityId: record.id,
      after: { employeeId: dto.employeeId, category: dto.category, type: dto.type, title: dto.title },
    });
    return record;
  }

  async update(id: string, dto: UpdateEmployeeRecordDto, actorUserId: string) {
    const record = await this.prisma.employeeRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ceza/Ödül kaydı bulunamadı.');

    if (dto.issuedById) {
      const issuer = await this.prisma.user.findUnique({ where: { id: dto.issuedById } });
      if (!issuer) throw new BadRequestException('Düzenleyen kullanıcı bulunamadı.');
    }

    const updated = await this.prisma.employeeRecord.update({
      where: { id },
      data: {
        type: dto.type ?? record.type,
        title: dto.title ?? record.title,
        description: dto.description !== undefined ? (dto.description ?? null) : record.description,
        date: dto.date ? new Date(dto.date) : record.date,
        issuedById: dto.issuedById ?? record.issuedById,
        note: dto.note !== undefined ? (dto.note ?? null) : record.note,
      },
      include: recordInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'employee-record.update',
      entityType: 'employee_record',
      entityId: id,
      before: record,
      after: updated,
    });
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const record = await this.prisma.employeeRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ceza/Ödül kaydı bulunamadı.');
    await this.prisma.employeeRecord.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'employee-record.delete',
      entityType: 'employee_record',
      entityId: id,
      before: record,
    });
    return { deleted: true, id };
  }
}