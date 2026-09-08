import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShiftDay } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import { AssignShiftDto, BulkAssignShiftDto, CreateShiftDto, ShiftAssignmentListDto } from './dto/shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  async listShifts(query: { workLocationId?: string; includeInactive?: boolean }) {
    const where: Prisma.ShiftWhereInput = {};
    if (query.workLocationId) where.workLocationId = query.workLocationId;
    if (!query.includeInactive) where.isActive = true;

    const cacheKey = CacheKeys.shiftList(query);
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.shift.findMany({
      where,
      include: {
        workLocation: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
    await this.cache.set(cacheKey, result, CacheTTL.SHIFT);
    return result;
  }

  async createShift(dto: CreateShiftDto, actorUserId: string) {
    const shift = await this.prisma.shift.create({
      data: {
        name: dto.name,
        code: dto.code ?? null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMinutes: dto.breakMinutes ?? 60,
        description: dto.description ?? null,
        workLocationId: dto.workLocationId ?? null,
      },
      include: { workLocation: { select: { id: true, name: true } } },
    });
    await this.audit.log({
      actorUserId,
      action: 'shift.create',
      entityType: 'shift',
      entityId: shift.id,
      after: shift,
    });
    await this.cache.delByPrefix(CacheKeys.shiftPrefix());
    return shift;
  }

  async listAssignments(query: ShiftAssignmentListDto) {
    const where: Prisma.ShiftAssignmentWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.shiftId) where.shiftId = query.shiftId;
    if (query.day) where.day = query.day;

    return this.prisma.shiftAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: [{ day: 'asc' }, { employee: { firstName: 'asc' } }],
    });
  }

  async assign(dto: AssignShiftDto, actorUserId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new NotFoundException('Vardiya bulunamadı.');

    const days = this.resolveDays(dto.days, dto.day);

    if (dto.employeeIds?.length) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: dto.employeeIds } },
        select: { id: true },
      });
      if (employees.length !== dto.employeeIds.length) {
        throw new NotFoundException('Bazı personeller bulunamadı.');
      }
      const data = dto.employeeIds.flatMap((eid) =>
        days.map((day) => ({
          employeeId: eid,
          shiftId: dto.shiftId,
          day,
          createdById: actorUserId,
        })),
      );
      const result = await this.prisma.shiftAssignment.createMany({ data, skipDuplicates: true });
      await this.audit.log({
        actorUserId,
        action: 'shift.assign',
        entityType: 'shift_assignment',
        entityId: dto.shiftId,
        after: { count: result.count, days, employeeCount: dto.employeeIds.length },
      });
      return { assigned: result.count, skipped: dto.employeeIds.length * days.length - result.count, days };
    }
    throw new BadRequestException('employeeIds gerekli.');
  }

  async bulkAssign(dto: BulkAssignShiftDto, actorUserId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new NotFoundException('Vardiya bulunamadı.');
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: dto.employeeIds } },
      select: { id: true },
    });
    if (employees.length !== dto.employeeIds.length) {
      throw new NotFoundException('Bazı personeller bulunamadı.');
    }
    const days = this.resolveDays(dto.days, dto.day);
    const data = dto.employeeIds.flatMap((eid) =>
      days.map((day) => ({
        employeeId: eid,
        shiftId: dto.shiftId,
        day,
        createdById: actorUserId,
      })),
    );
    const result = await this.prisma.shiftAssignment.createMany({ data, skipDuplicates: true });
    await this.audit.log({
      actorUserId,
      action: 'shift.assign',
      entityType: 'shift_assignment',
      entityId: dto.shiftId,
      after: { count: result.count, days, employeeCount: dto.employeeIds.length },
    });
    return { assigned: result.count, skipped: dto.employeeIds.length * days.length - result.count, days };
  }

  private resolveDays(days?: ShiftDay[], legacyDay?: ShiftDay): ShiftDay[] {
    const resolved = days?.length ? days : legacyDay ? [legacyDay] : [];
    if (!resolved.length) throw new BadRequestException('En az bir gün seçilmelidir.');
    return resolved;
  }

  async removeAssignment(id: string, actorUserId: string) {
    const existing = await this.prisma.shiftAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Atama bulunamadı.');
    await this.prisma.shiftAssignment.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'shift.unassign',
      entityType: 'shift_assignment',
      entityId: id,
      before: existing,
    });
    return { deleted: true };
  }

  async removeShift(id: string, actorUserId: string) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vardiya bulunamadı.');

    await this.prisma.$transaction([
      this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id } }),
      this.prisma.shift.delete({ where: { id } }),
    ]);

    await this.audit.log({
      actorUserId,
      action: 'shift.delete',
      entityType: 'shift',
      entityId: id,
      before: existing,
    });
    await this.cache.delByPrefix(CacheKeys.shiftPrefix());
    return { id, deleted: true };
  }
}