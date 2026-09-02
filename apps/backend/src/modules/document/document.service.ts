import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

  async list(query: DocumentListQueryDto) {
    const { employeeId, priority, status, search, from, to, page = 1, pageSize = 20 } = query;

    const where: Record<string, unknown> = {};

    if (employeeId) where.employeeId = employeeId;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (from || to) {
      where.receivedAt = {};
      if (from) (where.receivedAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.receivedAt as Record<string, unknown>).lte = new Date(to);
    }
    if (search) {
      where.OR = [
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
}
