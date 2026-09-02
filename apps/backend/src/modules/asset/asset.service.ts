import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AssetListQueryDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

const assetInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
} as const;

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AssetListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AssetWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
        { serialNo: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: assetInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async create(dto: CreateAssetDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');

    const asset = await this.prisma.asset.create({
      data: {
        employeeId: dto.employeeId,
        name: dto.name,
        code: dto.code ?? null,
        serialNo: dto.serialNo ?? null,
        category: dto.category ?? null,
        description: dto.description ?? null,
        condition: dto.condition ?? null,
        assignedDate: dto.assignedDate ? new Date(dto.assignedDate) : null,
        status: dto.status ?? AssetStatus.ASSIGNED,
        note: dto.note ?? null,
      },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'asset.create',
      entityType: 'asset',
      entityId: asset.id,
      after: { employeeId: dto.employeeId, name: dto.name, status: asset.status },
    });
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, actorUserId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Zimmet kaydı bulunamadı.');

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name ?? asset.name,
        code: dto.code !== undefined ? (dto.code ?? null) : asset.code,
        serialNo: dto.serialNo !== undefined ? (dto.serialNo ?? null) : asset.serialNo,
        category: dto.category !== undefined ? (dto.category ?? null) : asset.category,
        description: dto.description !== undefined ? (dto.description ?? null) : asset.description,
        condition: dto.condition !== undefined ? (dto.condition ?? null) : asset.condition,
        assignedDate: dto.assignedDate !== undefined ? (dto.assignedDate ? new Date(dto.assignedDate) : null) : asset.assignedDate,
        note: dto.note !== undefined ? (dto.note ?? null) : asset.note,
      },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'asset.update',
      entityType: 'asset',
      entityId: id,
      before: asset,
      after: updated,
    });
    return updated;
  }

  async updateStatus(id: string, status: AssetStatus, actorUserId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Zimmet kaydı bulunamadı.');

    const targetStatus: AssetStatus = status;
    const isReturning = status === AssetStatus.RETURNED;

    // İade ediliyorsa iade tarihi işle; başka bir duruma geçiyorsa iade durumundaysa temizle
    let returnedDate = asset.returnedDate;
    if (isReturning) returnedDate = new Date();
    else if (asset.status === AssetStatus.RETURNED) returnedDate = null;

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: targetStatus, returnedDate },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'asset.status',
      entityType: 'asset',
      entityId: id,
      before: asset,
      after: updated,
    });
    return updated;
  }

  async returnItem(id: string, actorUserId: string) {
    return this.updateStatus(id, AssetStatus.RETURNED, actorUserId);
  }

  async remove(id: string, actorUserId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Zimmet kaydı bulunamadı.');
    await this.prisma.asset.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'asset.delete',
      entityType: 'asset',
      entityId: id,
      before: asset,
    });
    return { deleted: true, id };
  }

  async getStats() {
    const statusCounts = await this.prisma.asset.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const categoryCounts = await this.prisma.asset.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    const total = await this.prisma.asset.count();

    return {
      total,
      byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
      byCategory: categoryCounts.map((c) => ({ category: c.category, count: c._count.id })),
    };
  }
}