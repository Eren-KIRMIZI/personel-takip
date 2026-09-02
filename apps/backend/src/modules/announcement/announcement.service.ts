import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementListQueryDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AnnouncementListQueryDto) {
    const { status, search, page = 1, pageSize = 20 } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: {
          _count: { select: { reads: true, targetEmployees: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // Oturumdaki kullanıcının/personelin görebileceği duyurular
  async listForEmployee(employeeId: string, page = 1, pageSize = 20) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true, unitId: true },
    });

    const now = new Date();
    const where = {
      status: 'PUBLISHED' as const,
      OR: [
        { publishAt: null },
        { publishAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { expireAt: null },
            { expireAt: { gte: now } },
          ],
        },
        {
          OR: [
            { targetType: 'ALL' as const },
            { targetType: 'DEPARTMENT' as const, targetId: employee?.departmentId ?? '__none__' },
            { targetType: 'UNIT' as const, targetId: employee?.unitId ?? '__none__' },
            { targetType: 'SPECIFIC' as const, targetEmployees: { some: { employeeId } } },
          ],
        },
      ],
    };

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: {
          reads: { where: { employeeId }, select: { readAt: true } },
        },
        orderBy: { publishAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      items: items.map((a) => ({ ...a, isRead: a.reads.length > 0, readAt: a.reads[0]?.readAt ?? null })),
      total,
      page,
      pageSize,
    };
  }

  async find(id: string) {
    const ann = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        targetEmployees: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        _count: { select: { reads: true } },
      },
    });
    if (!ann) throw new NotFoundException('Duyuru bulunamadı');
    return ann;
  }

  async create(dto: CreateAnnouncementDto, createdById?: string) {
    const { targetEmployeeIds, ...rest } = dto;
    return this.prisma.announcement.create({
      data: {
        title: rest.title,
        content: rest.content,
        status: rest.status ?? 'DRAFT',
        targetType: rest.targetType ?? 'ALL',
        targetId: rest.targetId,
        publishAt: rest.publishAt ? new Date(rest.publishAt) : undefined,
        expireAt: rest.expireAt ? new Date(rest.expireAt) : undefined,
        createdById,
        updatedById: createdById,
        targetEmployees: targetEmployeeIds?.length
          ? { createMany: { data: targetEmployeeIds.map((eid) => ({ employeeId: eid })) } }
          : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto, updatedById?: string) {
    await this.find(id);
    const { targetEmployeeIds, ...rest } = dto;

    if (rest.targetType && rest.targetType !== 'SPECIFIC') {
      // Hedef kitle SPECIFIC değilse mevcut kişisel hedefleri temizle
      await this.prisma.announcementEmployee.deleteMany({ where: { announcementId: id } });
    }
    if (targetEmployeeIds) {
      await this.prisma.announcementEmployee.deleteMany({ where: { announcementId: id } });
      if (targetEmployeeIds.length) {
        await this.prisma.announcementEmployee.createMany({
          data: targetEmployeeIds.map((eid) => ({ announcementId: id, employeeId: eid })),
        });
      }
    }

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...rest,
        publishAt: rest.publishAt ? new Date(rest.publishAt) : undefined,
        expireAt: rest.expireAt ? new Date(rest.expireAt) : undefined,
        updatedById,
      },
    });
  }

  async markRead(id: string, employeeId: string) {
    await this.find(id);
    await this.prisma.announcementRead.upsert({
      where: { announcementId_employeeId: { announcementId: id, employeeId } },
      create: { announcementId: id, employeeId },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  async remove(id: string) {
    await this.find(id);
    return this.prisma.announcement.delete({ where: { id } });
  }
}
