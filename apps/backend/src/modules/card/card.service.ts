import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PunchSource, PunchType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { employeeScopedWhere } from '../../common/scope';
import {
  CreateCardCredentialDto,
  CreateCardReaderDto,
  ScanCardDto,
  UpdateCardCredentialDto,
  UpdateCardReaderDto,
} from './dto/card.dto';

const cardCredentialInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
} as const;

const cardReaderInclude = {
  location: { select: { id: true, name: true, address: true } },
} as const;

@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // KART OKUTMA — PDKS cihazı / simülatör giriş noktası
  // ---------------------------------------------------------------------------
  async scan(dto: ScanCardDto, actor: { userId: string; employeeId?: string | null }) {
    const credential = await this.prisma.cardCredential.findUnique({
      where: { cardUid: dto.cardUid },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } } },
    });
    if (!credential) throw new BadRequestException('Bu kart hiçbir personele tanımlı değil.');
    if (!credential.isActive) throw new BadRequestException('Bu kart pasif durumda.');

    const employeeId = dto.employeeId ?? credential.employeeId;
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');

    let reader = null;
    if (dto.readerId) {
      reader = await this.prisma.cardReader.findUnique({ where: { id: dto.readerId } });
      if (!reader) throw new NotFoundException('Kart okuyucu cihazı bulunamadı.');
      if (!reader.isActive) throw new BadRequestException('Kart okuyucu cihazı pasif durumda.');
    }

    // QR akışıyla birebir aynı toggle mantığı: son kayıt OUT/boş ise IN, IN ise OUT
    const last = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId },
      orderBy: { timestamp: 'desc' },
    });
    const type: PunchType = !last || last.type === PunchType.OUT ? PunchType.IN : PunchType.OUT;

    const record = await this.prisma.attendanceRecord.create({
      data: {
        employeeId,
        type,
        source: PunchSource.CARD,
        timestamp: new Date(),
        locationId: reader?.locationId ?? employee.workLocationId ?? null,
        cardReaderId: reader?.id ?? null,
        cardCredentialId: credential.id,
        deviceInfo: reader?.serialNo ?? null,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true } },
        location: { select: { id: true, name: true, address: true } },
      },
    });

    await this.audit.log({
      actorUserId: actor.userId,
      action: 'attendance.card.scan',
      entityType: 'attendance',
      entityId: record.id,
      after: record,
    });

    return {
      id: record.id,
      type: record.type,
      source: record.source,
      timestamp: record.timestamp,
      cardUid: credential.cardUid,
      reader: reader ? { id: reader.id, name: reader.name, serialNo: reader.serialNo } : null,
      employee: record.employee,
      location: record.location,
    };
  }

  // ---------------------------------------------------------------------------
  // KART KREDANSİYALLERİ (Personel → Kart eşleşmesi)
  // ---------------------------------------------------------------------------
  async listCredentials(query: { page?: number; pageSize?: number; employeeId?: string }, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const base: Prisma.CardCredentialWhereInput = {};
    if (query.employeeId) base.employeeId = query.employeeId;

    const where = employeeScopedWhere(user, base);

    const [items, total] = await Promise.all([
      this.prisma.cardCredential.findMany({
        where,
        include: cardCredentialInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cardCredential.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createCredential(dto: CreateCardCredentialDto, actorUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Personel bulunamadı.');

    const existing = await this.prisma.cardCredential.findUnique({ where: { cardUid: dto.cardUid } });
    if (existing) throw new BadRequestException('Bu kart ID zaten başka bir personele tanımlı.');

    const credential = await this.prisma.cardCredential.create({
      data: {
        employeeId: dto.employeeId,
        cardUid: dto.cardUid,
        isActive: dto.isActive ?? true,
        note: dto.note ?? null,
      },
      include: cardCredentialInclude,
    });

    await this.audit.log({
      actorUserId,
      action: 'card.credential.create',
      entityType: 'card_credential',
      entityId: credential.id,
      after: credential,
    });
    return credential;
  }

  async updateCredential(id: string, dto: UpdateCardCredentialDto, actorUserId: string) {
    const existing = await this.prisma.cardCredential.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kart kaydı bulunamadı.');

    if (dto.cardUid && dto.cardUid !== existing.cardUid) {
      const dup = await this.prisma.cardCredential.findUnique({ where: { cardUid: dto.cardUid } });
      if (dup) throw new BadRequestException('Bu kart ID zaten başka bir personele tanımlı.');
    }

    const updated = await this.prisma.cardCredential.update({
      where: { id },
      data: {
        cardUid: dto.cardUid ?? undefined,
        isActive: dto.isActive ?? undefined,
        note: dto.note ?? undefined,
      },
      include: cardCredentialInclude,
    });

    await this.audit.log({
      actorUserId,
      action: 'card.credential.update',
      entityType: 'card_credential',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  // ---------------------------------------------------------------------------
  // KART OKUYUCU CİHAZLARI (PDKS cihazları)
  // ---------------------------------------------------------------------------
  async listReaders(query: { page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.cardReader.findMany({
        where: {},
        include: cardReaderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cardReader.count({ where: {} }),
    ]);
    return { items, total, page, pageSize };
  }

  async createReader(dto: CreateCardReaderDto, actorUserId: string) {
    if (dto.locationId) {
      const location = await this.prisma.workLocation.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new NotFoundException('Çalışma yeri bulunamadı.');
    }

    const reader = await this.prisma.cardReader.create({
      data: {
        name: dto.name,
        serialNo: dto.serialNo ?? null,
        locationId: dto.locationId ?? null,
        isActive: dto.isActive ?? true,
      },
      include: cardReaderInclude,
    });

    await this.audit.log({
      actorUserId,
      action: 'card.reader.create',
      entityType: 'card_reader',
      entityId: reader.id,
      after: reader,
    });
    return reader;
  }

  async updateReader(id: string, dto: UpdateCardReaderDto, actorUserId: string) {
    const existing = await this.prisma.cardReader.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kart okuyucu cihazı bulunamadı.');

    if (dto.locationId) {
      const location = await this.prisma.workLocation.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new NotFoundException('Çalışma yeri bulunamadı.');
    }

    const updated = await this.prisma.cardReader.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        serialNo: dto.serialNo ?? undefined,
        locationId: dto.locationId ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
      include: cardReaderInclude,
    });

    await this.audit.log({
      actorUserId,
      action: 'card.reader.update',
      entityType: 'card_reader',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }
}