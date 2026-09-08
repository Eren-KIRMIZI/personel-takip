import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PunchSource, PunchType } from '@prisma/client';
import QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import {
  AttendanceDailyQueryDto,
  AttendanceListQueryDto,
  CreateAttendanceDto,
  CreateQrCodeDto,
  RotateQrCodeDto,
  ScanAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

const attendanceInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
  location: { select: { id: true, name: true, address: true } },
} as const;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AttendanceListQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const base: Prisma.AttendanceRecordWhereInput = {};
    if (query.employeeId) base.employeeId = query.employeeId;
    if (query.type) base.type = query.type;
    if (query.source) base.source = query.source;
    if (query.from || query.to) {
      base.timestamp = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const where = employeeScopedWhere(actor, base);

    const [items, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        include: attendanceInclude,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async daily(query: AttendanceDailyQueryDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const dayStart = new Date(`${query.day}T00:00:00`);
    const dayEnd = new Date(`${query.day}T23:59:59.999`);

    const base: Prisma.AttendanceRecordWhereInput = {
      timestamp: { gte: dayStart, lte: dayEnd },
    };
    if (query.employeeId) base.employeeId = query.employeeId;

    const where = employeeScopedWhere(actor, base);

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: attendanceInclude,
      orderBy: { timestamp: 'asc' },
    });

    const byEmployee = new Map<
      string,
      {
        employee: (typeof records)[number]['employee'];
        checkIn?: (typeof records)[number];
        checkOut?: (typeof records)[number];
      }
    >();

    for (const r of records) {
      let acc = byEmployee.get(r.employeeId);
      if (!acc) {
        acc = { employee: r.employee };
        byEmployee.set(r.employeeId, acc);
      }
      if (r.type === PunchType.IN) {
        if (!acc.checkIn) acc.checkIn = r;
      } else {
        if (!acc.checkOut || r.timestamp > acc.checkOut.timestamp) acc.checkOut = r;
      }
    }

    const total = byEmployee.size;
    const items = Array.from(byEmployee.values())
      .sort((a, b) => `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(`${b.employee.firstName} ${b.employee.lastName}`))
      .slice((page - 1) * pageSize, page * pageSize)
      .map((acc) => ({
        id: acc.checkIn?.id ?? acc.checkOut?.id ?? null,
        employee: acc.employee,
        day: query.day,
        checkIn: acc.checkIn ? { id: acc.checkIn.id, at: acc.checkIn.timestamp, source: acc.checkIn.source, location: acc.checkIn.location } : null,
        checkOut: acc.checkOut ? { id: acc.checkOut.id, at: acc.checkOut.timestamp, source: acc.checkOut.source, location: acc.checkOut.location } : null,
      }));

    return { items, total, page, pageSize, day: query.day };
  }

  async punch(dto: CreateAttendanceDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');
    if (dto.locationId) {
      const location = await this.prisma.workLocation.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new NotFoundException('Çalışma yeri bulunamadı.');
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        source: PunchSource.MANUAL,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        locationId: dto.locationId ?? null,
        deviceInfo: dto.deviceInfo ?? null,
      },
      include: attendanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'attendance.punch',
      entityType: 'attendance',
      entityId: record.id,
      after: record,
    });
    return record;
  }

  async update(id: string, dto: UpdateAttendanceDto, actorUserId: string) {
    const existing = await this.prisma.attendanceRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Giriş-çıkış kaydı bulunamadı.');

    if (dto.locationId) {
      const location = await this.prisma.workLocation.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new NotFoundException('Çalışma yeri bulunamadı.');
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: {
        type: dto.type ?? undefined,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
        locationId: dto.locationId ?? undefined,
      },
      include: attendanceInclude,
    });
    await this.audit.log({
      actorUserId,
      action: 'attendance.update',
      entityType: 'attendance',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async qrCodes(query: { page?: number; pageSize?: number; includeInactive?: boolean }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.QrCodeWhereInput = {};
    if (!query.includeInactive) where.isActive = true;

    const [items, total] = await Promise.all([
      this.prisma.qrCode.findMany({
        where,
        include: { location: { select: { id: true, name: true, address: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.qrCode.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createQrCode(dto: CreateQrCodeDto, actorUserId: string) {
    const location = await this.prisma.workLocation.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundException('Çalışma yeri bulunamadı.');

    const qr = await this.prisma.qrCode.create({
      data: {
        token: this.generateToken(),
        locationId: dto.locationId,
        entryPointName: dto.entryPointName ?? null,
        isActive: dto.isActive ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: actorUserId,
      },
      include: { location: { select: { id: true, name: true, address: true } } },
    });
    await this.audit.log({
      actorUserId,
      action: 'attendance.qr.create',
      entityType: 'qrcode',
      entityId: qr.id,
      after: qr,
    });
    return qr;
  }

  async rotateQrCode(id: string, actorUserId: string) {
    const existing = await this.prisma.qrCode.findUnique({
      where: { id },
      include: { location: { select: { id: true, name: true, address: true } } },
    });
    if (!existing) throw new NotFoundException('QR kodu bulunamadı.');

    // Eski QR'ı pasife çek
    await this.prisma.qrCode.update({
      where: { id },
      data: { isActive: false },
    });

    // Aynı lokasyon için yeni token ile yeni QR oluştur
    const newQr = await this.prisma.qrCode.create({
      data: {
        token: this.generateToken(),
        locationId: existing.locationId,
        entryPointName: existing.entryPointName,
        isActive: true,
        expiresAt: null,
        createdById: actorUserId,
      },
      include: { location: { select: { id: true, name: true, address: true } } },
    });

    await this.audit.log({
      actorUserId,
      action: 'attendance.qr.rotate',
      entityType: 'qrcode',
      entityId: newQr.id,
      before: { id: existing.id, token: existing.token },
      after: { id: newQr.id, token: newQr.token },
    });

    return newQr;
  }

  async scan(dto: ScanAttendanceDto, actor: { userId: string; employeeId?: string | null }) {
    const qr = await this.prisma.qrCode.findUnique({ where: { token: dto.content } });
    if (!qr) throw new BadRequestException('Geçersiz QR kodu.');
    if (!qr.isActive) throw new BadRequestException('QR kodu pasif durumda.');
    if (qr.expiresAt && qr.expiresAt < new Date()) {
      throw new BadRequestException('QR kodunun süresi dolmuş.');
    }

    const employeeId = dto.employeeId ?? actor.employeeId;
    if (!employeeId) throw new BadRequestException('Personel bilgisi bulunamadı; employeeId gerekli.');
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');

    const last = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId },
      orderBy: { timestamp: 'desc' },
    });
    const type: PunchType = !last || last.type === PunchType.OUT ? PunchType.IN : PunchType.OUT;

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        type,
        source: PunchSource.QR,
        timestamp: new Date(),
        locationId: qr.locationId,
        qrCodeId: qr.id,
      },
      include: attendanceInclude,
    });
    await this.audit.log({
      actorUserId: actor.userId,
      action: 'attendance.qr.scan',
      entityType: 'attendance',
      entityId: record.id,
      after: record,
    });
    return record;
  }

  async qrImage(id: string) {
    const qr = await this.prisma.qrCode.findUnique({ where: { id } });
    if (!qr) throw new NotFoundException('QR kodu bulunamadı.');
    const dataUrl = await QRCode.toDataURL(qr.token, { width: 320, margin: 1 });
    return { id: qr.id, token: qr.token, encoding: 'PNG', contentType: 'image/png', dataUrl };
  }

  private generateToken(): string {
    const crypto = require('crypto') as typeof import('crypto');
    return 'qr_' + crypto.randomBytes(20).toString('hex');
  }
}