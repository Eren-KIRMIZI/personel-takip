import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PunchSource, PunchType } from '@prisma/client';
import QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  AttendanceListQueryDto,
  CreateAttendanceDto,
  CreateQrCodeDto,
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

  async list(query: AttendanceListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.AttendanceRecordWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.type) where.type = query.type;
    if (query.source) where.source = query.source;
    if (query.from || query.to) {
      where.timestamp = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

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