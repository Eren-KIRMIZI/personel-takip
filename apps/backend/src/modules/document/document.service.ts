import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import { CreateDocumentDto, UpdateDocumentDto, DocumentListQueryDto } from './dto/document.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  private includeRelations = {
    employee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        photoUrl: true,
      },
    },
  };

  async list(query: DocumentListQueryDto, actor: AuthenticatedUser) {
    const { employeeId, priority, status, search, from, to, page = 1, pageSize = 20 } = query;

    const base: Record<string, unknown> = {};

    if (employeeId) base.employeeId = employeeId;
    if (priority) base.priority = priority;
    if (status) base.status = status;
    if (from || to) {
      base.receivedAt = {};
      if (from) (base.receivedAt as Record<string, unknown>).gte = new Date(from);
      if (to) (base.receivedAt as Record<string, unknown>).lte = new Date(to);
    }
    if (search) {
      base.OR = [
        { documentNo: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const where = employeeScopedWhere(actor, base);

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: this.includeRelations,
        orderBy: [{ priority: 'desc' }, { receivedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async find(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!doc) throw new NotFoundException('Evrak bulunamadı');
    return doc;
  }

  async create(dto: CreateDocumentDto, createdById?: string) {
    return this.prisma.document.create({
      data: {
        documentNo: dto.documentNo,
        subject: dto.subject,
        content: dto.content,
        employeeId: dto.employeeId,
        unitId: dto.unitId,
        priority: dto.priority ?? 'NORMAL',
        status: dto.status ?? 'PENDING',
        processType: dto.processType,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
        attachmentUrl: dto.attachmentUrl,
        note: dto.note,
        createdById,
        updatedById: createdById,
      },
      include: this.includeRelations,
    });
  }

  async update(id: string, dto: UpdateDocumentDto, updatedById?: string) {
    await this.find(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...dto,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
        lastActionAt: new Date(),
        updatedById,
      },
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    await this.find(id);
    return this.prisma.document.delete({ where: { id } });
  }

  async getStats() {
    const statusCounts = await this.prisma.document.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const priorityCounts = await this.prisma.document.groupBy({
      by: ['priority'],
      _count: { id: true },
    });

    const total = await this.prisma.document.count();

    return {
      total,
      byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: priorityCounts.map((p) => ({ priority: p.priority, count: p._count.id })),
    };
  }
}
