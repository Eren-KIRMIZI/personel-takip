import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import { AssetListQueryDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

const assetInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
} as const;

type AssetWithEmployee = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
  ) {}

  async list(query: AssetListQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);
    const base: Prisma.AssetWhereInput = {};
    if (query.employeeId) base.employeeId = query.employeeId;
    if (query.status) base.status = query.status;
    if (query.category) base.category = query.category;
    if (query.q) {
      base.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
        { serialNo: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const where = employeeScopedWhere(actor, base);

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
        status: dto.status ?? AssetStatus.PENDING_APPROVAL,
        issuedById: actorUserId,
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

    // Atanan personelin kullanıcısını haberdar et
    const employeeUser = await this.prisma.user.findUnique({ where: { employeeId: dto.employeeId } });
    if (employeeUser) {
      await this.notification.create({
        userId: employeeUser.id,
        type: NotificationType.ASSET_APPROVAL_PENDING,
        title: 'Yeni zimmet onayı bekliyor',
        body: `${asset.name} zimmeti için onayınız bekleniyor.`,
        entityType: 'asset',
        entityId: asset.id,
      });
    }
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

  // ── Personel tarafı: atamayı onayla / reddet ──────────────────────────────

  async approveAssignment(id: string, actor: AuthenticatedUser) {
    const asset = await this.ensure(id);
    this.assertOwner(asset, actor);
    if (asset.status !== AssetStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Yalnızca onay bekleyen zimmetler onaylanabilir.');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        status: AssetStatus.ASSIGNED,
        assignedDate: asset.assignedDate ?? new Date(),
        approvedAt: new Date(),
      },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'asset.approve',
      entityType: 'asset',
      entityId: id,
      before: asset,
      after: updated,
    });
    if (asset.issuedById) {
      await this.notification.create({
        userId: asset.issuedById,
        type: NotificationType.ASSET_ASSIGNED,
        title: 'Zimmet onaylandı',
        body: `${asset.employee.firstName} ${asset.employee.lastName}, ${asset.name} zimmetini onayladı.`,
        entityType: 'asset',
        entityId: asset.id,
      });
    }
    return updated;
  }

  async rejectAssignment(id: string, actor: AuthenticatedUser, reason?: string) {
    const asset = await this.ensure(id);
    this.assertOwner(asset, actor);
    if (asset.status !== AssetStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Yalnızca onay bekleyen zimmetler reddedilebilir.');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.REJECTED, rejectionReason: reason ?? null, rejectedAt: new Date() },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'asset.reject',
      entityType: 'asset',
      entityId: id,
      before: asset,
      after: updated,
    });
    if (asset.issuedById) {
      await this.notification.create({
        userId: asset.issuedById,
        type: NotificationType.ASSET_RETURN_REQUEST,
        title: 'Zimmet reddedildi',
        body: `${asset.employee.firstName} ${asset.employee.lastName}, ${asset.name} zimmetini reddetti${reason ? ` (${reason})` : ''}.`,
        entityType: 'asset',
        entityId: asset.id,
      });
    }
    return updated;
  }

  // ── Personel tarafı: iade talebi ──────────────────────────────────────────

  async requestReturn(id: string, actor: AuthenticatedUser) {
    const asset = await this.ensure(id);
    this.assertOwner(asset, actor);
    if (asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestException('Yalnızca teslim edilmiş zimmetler için iade talep edilebilir.');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.RETURN_PENDING, returnRequestedAt: new Date() },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'asset.return_request',
      entityType: 'asset',
      entityId: id,
      before: asset,
      after: updated,
    });
    if (asset.issuedById) {
      await this.notification.create({
        userId: asset.issuedById,
        type: NotificationType.ASSET_RETURN_REQUEST,
        title: 'İade talebi',
        body: `${asset.employee.firstName} ${asset.employee.lastName}, ${asset.name} zimmeti için iade talebinde bulundu.`,
        entityType: 'asset',
        entityId: asset.id,
      });
    }
    return updated;
  }

  // ── Yönetici tarafı: iadeyi onayla / reddet ───────────────────────────────

  async returnItem(id: string, actorUserId: string) {
    const asset = await this.ensure(id);
    if (asset.status !== AssetStatus.RETURN_PENDING && asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestException('İade talebi bekleyen zimmet iade edilebilir.');
    }
    const updated = await this.updateStatus(id, AssetStatus.RETURNED, actorUserId);
    // İadeyi onaylayan personeli haberdar et
    const employeeUser = await this.prisma.user.findUnique({ where: { employeeId: asset.employeeId } });
    if (employeeUser) {
      await this.notification.create({
        userId: employeeUser.id,
        type: NotificationType.ASSET_RETURNED,
        title: 'İade onaylandı',
        body: `${asset.name} zimmeti teslim alındı.`,
        entityType: 'asset',
        entityId: asset.id,
      });
    }
    return updated;
  }

  async cancelReturn(id: string, actorUserId: string) {
    const asset = await this.ensure(id);
    if (asset.status !== AssetStatus.RETURN_PENDING) {
      throw new BadRequestException('Yalnızca iade talebi bekleyen zimmetler geri çekilebilir.');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.ASSIGNED, returnRequestedAt: null },
      include: assetInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'asset.return_cancel',
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

  private async ensure(id: string): Promise<AssetWithEmployee> {
    const asset = await this.prisma.asset.findUnique({ where: { id }, include: assetInclude });
    if (!asset) throw new NotFoundException('Zimmet kaydı bulunamadı.');
    return asset;
  }

  private assertOwner(asset: { employeeId: string }, actor: AuthenticatedUser) {
    if (!actor.employeeId || actor.employeeId !== asset.employeeId) {
      throw new ForbiddenException('Bu işlemi yalnızca zimmetin sahibi personel yapabilir.');
    }
  }
}