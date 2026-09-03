import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import {
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  LeaveListQueryDto,
  UpdateLeaveTypeDto,
} from './dto/leave.dto';

const requestInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
  leaveType: { select: { id: true, name: true, code: true, color: true, paid: true } },
} as const;

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ------------------------------------------------------------
  // İzin tipleri
  // ------------------------------------------------------------

  async listLeaveTypes() {
    const cacheKey = CacheKeys.leaveTypes();
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    await this.cache.set(cacheKey, result, CacheTTL.LEAVE_TYPES);
    return result;
  }

  async createLeaveType(dto: CreateLeaveTypeDto, actorUserId: string) {
    const leaveType = await this.prisma.leaveType.create({ data: dto });
    await this.audit.log({
      actorUserId,
      action: 'leaveType.create',
      entityType: 'leaveType',
      entityId: leaveType.id,
      after: dto,
    });
    await this.cache.del(CacheKeys.leaveTypes());
    return leaveType;
  }

  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto, actorUserId: string) {
    await this.ensureLeaveType(id);
    const updated = await this.prisma.leaveType.update({ where: { id }, data: dto });
    await this.audit.log({
      actorUserId,
      action: 'leaveType.update',
      entityType: 'leaveType',
      entityId: id,
      before: updated,
      after: updated,
    });
    await this.cache.del(CacheKeys.leaveTypes());
    return updated;
  }

  async removeLeaveType(id: string, actorUserId: string) {
    const before = await this.ensureLeaveType(id);
    const usage = await this.prisma.leaveRequest.count({ where: { leaveTypeId: id } });
    if (usage > 0) {
      // Kullanılmış tipler silinmez; pasife alınır
      const deactivated = await this.prisma.leaveType.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.log({
        actorUserId,
        action: 'leaveType.deactivate',
        entityType: 'leaveType',
        entityId: id,
        before,
        after: deactivated,
      });
      return deactivated;
    }
    await this.prisma.leaveType.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'leaveType.delete',
      entityType: 'leaveType',
      entityId: id,
      before,
    });
    await this.cache.del(CacheKeys.leaveTypes());
    return { id };
  }

  // ------------------------------------------------------------
  // Talep yönetimi
  // ------------------------------------------------------------

  async listRequests(query: LeaveListQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const base: Prisma.LeaveRequestWhereInput = {};
    if (query.status) base.status = query.status;
    if (query.employeeId) base.employeeId = query.employeeId;
    if (query.leaveTypeId) base.leaveTypeId = query.leaveTypeId;

    const where = employeeScopedWhere(actor, base);

    // İzin listesi kısa TTL ile cache'lenir
    const cacheKey = CacheKeys.leaveList({ ...query, page, pageSize, actorId: actor.userId });
    const cached = await this.cache.get<{ items: unknown[]; total: number; page: number; pageSize: number }>(cacheKey);
    if (cached) return cached;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    const result = { items, total, page, pageSize };
    await this.cache.set(cacheKey, result, CacheTTL.LEAVE_LIST);
    return result;
  }

  async findRequest(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) throw new NotFoundException('İzin talebi bulunamadı.');
    return request;
  }

  async createRequest(dto: CreateLeaveRequestDto, actor: AuthenticatedUser) {
    const actorUserId = actor.userId;
    const isAdmin = actor.roles.includes('ADMIN');
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    await this.prisma.leaveType.findUniqueOrThrow({ where: { id: dto.leaveTypeId } });

    const days = this.calculateDays(dto.startDate, dto.endDate);
    if (days <= 0) throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz.');

    await this.assertNoOverlap(dto.employeeId, dto.startDate, dto.endDate, isAdmin);

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        description: dto.description ?? null,
        documentUrl: dto.documentUrl ?? null,
      },
      include: requestInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'leave.create',
      entityType: 'leaveRequest',
      entityId: request.id,
      after: request,
    });
    await this.cache.delByPrefix(CacheKeys.leaveListPrefix());
    return request;
  }

  async approve(id: string, actorUserId: string) {
    const before = await this.ensureRequest(id);
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen talepler onaylanabilir.');
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.APPROVED, approvedById: actorUserId, approvedAt: new Date() },
      include: requestInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'leave.approve',
      entityType: 'leaveRequest',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async reject(id: string, reason: string, actorUserId: string) {
    const before = await this.ensureRequest(id);
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen talepler reddedilebilir.');
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.REJECTED, rejectionReason: reason },
      include: requestInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'leave.reject',
      entityType: 'leaveRequest',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async cancel(id: string, actorUserId: string) {
    const before = await this.ensureRequest(id);
    if (before.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Yalnızca bekleyen talepler iptal edilebilir.');
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: requestInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'leave.cancel',
      entityType: 'leaveRequest',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  // ------------------------------------------------------------
  // Yardımcılar
  // ------------------------------------------------------------

  private async assertNoOverlap(employeeId: string, startDate: string, endDate: string, isAdmin = false) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const statusIn = isAdmin ? [LeaveStatus.APPROVED] : [LeaveStatus.PENDING, LeaveStatus.APPROVED];
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: statusIn },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) {
      throw new BadRequestException('Bu tarih aralığında bekleyen/onaylı başka bir izin var.');
    }
  }

  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  private async ensureLeaveType(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!leaveType) throw new NotFoundException('İzin tipi bulunamadı.');
    return leaveType;
  }

  private async ensureRequest(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id }, include: requestInclude });
    if (!request) throw new NotFoundException('İzin talebi bulunamadı.');
    return request;
  }
}