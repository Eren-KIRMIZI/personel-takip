import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShiftDay } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AssignShiftDto, BulkAssignShiftDto, CreateShiftDto, ShiftAssignmentListDto } from './dto/shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listShifts(query: { workLocationId?: string; includeInactive?: boolean }) {
    const where: Prisma.ShiftWhereInput = {};
    if (query.workLocationId) where.workLocationId = query.workLocationId;
    if (!query.includeInactive) where.isActive = true;

    return this.prisma.shift.findMany({
      where,
      include: {
        workLocation: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
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

    if (dto.employeeIds?.length) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: dto.employeeIds } },
        select: { id: true },
      });
      if (employees.length !== dto.employeeIds.length) {
        throw new NotFoundException('Bazı personeller bulunamadı.');
      }
      const data = dto.employeeIds.map((eid) => ({
        employeeId: eid,
        shiftId: dto.shiftId,
        day: dto.day,
        createdById: actorUserId,
      }));
      const result = await this.prisma.shiftAssignment.createMany({ data, skipDuplicates: true });
      await this.audit.log({
        actorUserId,
        action: 'shift.assign',
        entityType: 'shift_assignment',
        entityId: dto.shiftId,
        after: { count: result.count, day: dto.day, employeeCount: dto.employeeIds.length },
      });
      return { assigned: result.count, skipped: dto.employeeIds.length - result.count };
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
    const data = dto.employeeIds.map((eid) => ({
      employeeId: eid,
      shiftId: dto.shiftId,
      day: dto.day,
      createdById: actorUserId,
    }));
    const result = await this.prisma.shiftAssignment.createMany({ data, skipDuplicates: true });
    await this.audit.log({
      actorUserId,
      action: 'shift.assign',
      entityType: 'shift_assignment',
      entityId: dto.shiftId,
      after: { count: result.count, day: dto.day, employeeCount: dto.employeeIds.length },
    });
    return { assigned: result.count, skipped: dto.employeeIds.length - result.count };
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
}