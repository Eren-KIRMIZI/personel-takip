import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditResult } from '@prisma/client';

export interface AuditLogInput {
  actorUserId?: string | null;
  employeeId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  result?: AuditResult;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput, fallbackResult: AuditResult = AuditResult.SUCCESS): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          employeeId: input.employeeId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          before: input.before ? JSON.parse(JSON.stringify(input.before)) : undefined,
          after: input.after ? JSON.parse(JSON.stringify(input.after)) : undefined,
          result: input.result ?? fallbackResult,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      // Denetim izni asla ana akışı bozmamalı
      this.logger.error(`Audit log yazılamadı: ${String(error)}`);
    }
  }
}