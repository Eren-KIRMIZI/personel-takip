import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import {
  IncidentSeverity,
  IncidentStatus,
  IncidentCategory,
  Prisma,
} from '@prisma/client';

const MONITORING_UNKNOWN = 'MONITORING_UNKNOWN';
const HEALTH_CACHE_KEY = 'monitoring:health:snapshot';
const HEALTH_CACHE_TTL = 30; // 30 saniye

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down' | typeof MONITORING_UNKNOWN;
  services: ServiceHealth[];
  checkedAt: string;
  stale: boolean;
}

export interface ServiceHealth {
  service: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  checkedAt: string;
  errorCode?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private incidentCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ── Sağlık Kontrolleri ────────────────────────────────────────

  /**
   * Dahili sağlık kontrolü: DB + Redis ping.
   * Salt okunur, düşük maliyetli.
   */
  async runInternalHealthCheck(): Promise<HealthSnapshot> {
    const results: ServiceHealth[] = [];
    const now = new Date().toISOString();

    // 1. Veritabanı ping
    const dbResult = await this.checkDatabase();
    results.push(dbResult);

    // 2. Redis ping
    const redisResult = await this.checkRedis();
    results.push(redisResult);

    // 3. Backend kendisi (process canlı ise bu çalışıyor)
    results.push({
      service: 'backend',
      status: 'ok',
      latencyMs: 0,
      checkedAt: now,
    });

    // Sonuçları DB'ye kaydet (fire-and-forget, hata olursa izleme durur ama uygulama devam eder)
    void this.persistHealthResults(results);

    // Genel durum: herhangi bir 'down' → down, 'degraded' → degraded
    let overallStatus: HealthSnapshot['status'] = 'ok';
    if (results.some((r) => r.status === 'down')) overallStatus = 'down';
    else if (results.some((r) => r.status === 'degraded')) overallStatus = 'degraded';

    const snapshot: HealthSnapshot = {
      status: overallStatus,
      services: results,
      checkedAt: now,
      stale: false,
    };

    // Cache'e yaz
    try {
      await this.cache.set(HEALTH_CACHE_KEY, snapshot, HEALTH_CACHE_TTL);
    } catch {
      // Cache hatası izlemeyi durdurmasın
    }

    return snapshot;
  }

  async getLastHealthSnapshot(): Promise<HealthSnapshot> {
    try {
      const cached = await this.cache.get<HealthSnapshot>(HEALTH_CACHE_KEY);
      if (cached) {
        // 2 dakikadan eski mi?
        const age = Date.now() - new Date(cached.checkedAt).getTime();
        return { ...cached, stale: age > 120_000 };
      }
    } catch {
      // Cache erişilemiyorsa
    }

    // Cache yoksa DB'den son sonuçları getir
    try {
      const services = ['backend', 'database', 'redis'];
      const results: ServiceHealth[] = [];

      for (const svc of services) {
        const last = await this.prisma.healthCheckResult.findFirst({
          where: { service: svc },
          orderBy: { checkedAt: 'desc' },
        });
        if (last) {
          const age = Date.now() - new Date(last.checkedAt).getTime();
          results.push({
            service: last.service,
            status: last.status as ServiceHealth['status'],
            latencyMs: last.latencyMs ?? undefined,
            checkedAt: last.checkedAt.toISOString(),
            errorCode: last.errorCode ?? undefined,
          });
          if (age > 120_000) {
            // Eski veri — stale işaretle
            return {
              status: MONITORING_UNKNOWN,
              services: results,
              checkedAt: last.checkedAt.toISOString(),
              stale: true,
            };
          }
        }
      }

      if (results.length === 0) {
        return {
          status: MONITORING_UNKNOWN,
          services: [],
          checkedAt: new Date().toISOString(),
          stale: true,
        };
      }

      let overallStatus: HealthSnapshot['status'] = 'ok';
      if (results.some((r) => r.status === 'down')) overallStatus = 'down';
      else if (results.some((r) => r.status === 'degraded')) overallStatus = 'degraded';

      return { status: overallStatus, services: results, checkedAt: results[0].checkedAt, stale: false };
    } catch {
      return {
        status: MONITORING_UNKNOWN,
        services: [],
        checkedAt: new Date().toISOString(),
        stale: true,
      };
    }
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: 'database',
        status: 'ok',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn('[Monitoring] DB sağlık kontrolü başarısız');
      // Hata oluştu — incident üret
      void this.createOrUpdateIncident({
        severity: IncidentSeverity.CRITICAL,
        category: IncidentCategory.DATABASE,
        service: 'database',
        title: 'Veritabanı bağlantısı başarısız',
        summary: 'Sağlık kontrolü sırasında veritabanına erişilemedi.',
        errorCode: 'DB_PING_FAILED',
      });
      return {
        service: 'database',
        status: 'down',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        errorCode: 'DB_PING_FAILED',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.cache.set('monitoring:ping', 'pong', 5);
      const val = await this.cache.get<string>('monitoring:ping');
      if (val !== 'pong') throw new Error('Redis ping değeri eşleşmiyor');
      return {
        service: 'redis',
        status: 'ok',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      this.logger.warn('[Monitoring] Redis sağlık kontrolü başarısız');
      void this.createOrUpdateIncident({
        severity: IncidentSeverity.WARNING,
        category: IncidentCategory.CACHE,
        service: 'redis',
        title: 'Redis cache erişilemiyor',
        summary: 'Redis ping kontrolü başarısız. Cache fallback aktif.',
        errorCode: 'REDIS_PING_FAILED',
      });
      return {
        service: 'redis',
        status: 'degraded',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        errorCode: 'REDIS_PING_FAILED',
      };
    }
  }

  private async persistHealthResults(results: ServiceHealth[]): Promise<void> {
    try {
      await this.prisma.healthCheckResult.createMany({
        data: results.map((r) => ({
          service: r.service,
          status: r.status,
          latencyMs: r.latencyMs ?? null,
          checkedAt: new Date(r.checkedAt),
          errorCode: r.errorCode ?? null,
          checkSource: 'internal',
        })),
      });

      // 7 günden eski kayıtları temizle (retention)
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await this.prisma.healthCheckResult.deleteMany({
        where: { checkedAt: { lt: cutoff } },
      });
    } catch (err) {
      this.logger.error('[Monitoring] Health sonuçları kaydedilemedi:', err);
    }
  }

  // ── Olay Yönetimi ────────────────────────────────────────────

  async createOrUpdateIncident(params: {
    severity: IncidentSeverity;
    category: IncidentCategory;
    service: string;
    module?: string;
    endpoint?: string;
    title: string;
    summary: string;
    errorCode?: string;
    httpStatus?: number;
    latencyMs?: number;
    correlationId?: string;
    affectedScope?: string;
    evidence?: Record<string, unknown>;
    source?: string;
    appVersion?: string;
  }): Promise<void> {
    try {
      // Aynı servis + kategori + açık olay var mı?
      const existing = await this.prisma.incident.findFirst({
        where: {
          service: params.service,
          category: params.category,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        },
        orderBy: { firstSeenAt: 'desc' },
      });

      if (existing) {
        // Mevcut olayı güncelle (deduplication)
        await this.prisma.incident.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeenAt: new Date(),
            // Daha kritikse severity'yi yükselt
            severity: this.higherSeverity(existing.severity, params.severity),
          },
        });

        // Yeni oluşum kaydı ekle
        await this.prisma.incidentOccurrence.create({
          data: {
            incidentId: existing.id,
            errorCode: params.errorCode ?? null,
            errorSummary: params.summary.slice(0, 500),
            httpStatus: params.httpStatus ?? null,
            latencyMs: params.latencyMs ?? null,
            source: params.source ?? 'health-check',
          },
        });
      } else {
        // Yeni olay oluştur
        const code = await this.generateIncidentCode();
        const incident = await this.prisma.incident.create({
          data: {
            incidentCode: code,
            severity: params.severity,
            category: params.category,
            service: params.service,
            module: params.module ?? null,
            endpoint: params.endpoint ?? null,
            title: params.title,
            summary: params.summary,
            affectedScope: params.affectedScope ?? null,
            correlationId: params.correlationId ?? null,
            appVersion: params.appVersion ?? null,
            evidence: params.evidence ? (params.evidence as Prisma.InputJsonValue) : undefined,
          },
        });

        await this.prisma.incidentOccurrence.create({
          data: {
            incidentId: incident.id,
            errorCode: params.errorCode ?? null,
            errorSummary: params.summary.slice(0, 500),
            httpStatus: params.httpStatus ?? null,
            latencyMs: params.latencyMs ?? null,
            source: params.source ?? 'health-check',
          },
        });

        this.logger.warn(`[Monitoring] Yeni olay: ${code} — ${params.title}`);
      }
    } catch (err) {
      // Olay kaydı asla ana akışı bozmamalı
      this.logger.error('[Monitoring] Olay kaydedilemedi:', err);
    }
  }

  /**
   * Client-side hata raporu.
   * Hassas alanlar maskelenir, stack trace saklanmaz.
   */
  async reportClientError(params: {
    message: string;
    route?: string;
    module?: string;
    correlationId?: string;
    appVersion?: string;
  }): Promise<void> {
    await this.createOrUpdateIncident({
      severity: IncidentSeverity.ERROR,
      category: IncidentCategory.CLIENT_ERROR,
      service: 'frontend',
      module: params.module,
      title: `Tarayıcı hatası: ${params.route ?? 'bilinmeyen sayfa'}`,
      summary: this.sanitizeMessage(params.message),
      correlationId: params.correlationId,
      appVersion: params.appVersion,
      source: 'client-error',
    });
  }

  /**
   * API 5xx hata tespiti — ExceptionFilter tarafından çağrılır.
   */
  async reportApiError(params: {
    endpoint: string;
    httpStatus: number;
    errorCode?: string;
    module?: string;
    latencyMs?: number;
  }): Promise<void> {
    const severity =
      params.httpStatus >= 500 ? IncidentSeverity.ERROR : IncidentSeverity.WARNING;

    await this.createOrUpdateIncident({
      severity,
      category: IncidentCategory.FUNCTIONAL_ERROR,
      service: 'backend',
      module: params.module,
      endpoint: params.endpoint,
      title: `API hatası: ${params.endpoint} (HTTP ${params.httpStatus})`,
      summary: `${params.endpoint} endpoint'i HTTP ${params.httpStatus} döndürdü.`,
      httpStatus: params.httpStatus,
      latencyMs: params.latencyMs,
      errorCode: params.errorCode,
      source: 'api-monitor',
    });
  }

  /**
   * Sistem toparlanma tespiti — ardışık başarılı kontrol sonrası çağrılır.
   */
  async markRecovery(service: string): Promise<void> {
    try {
      const openIncidents = await this.prisma.incident.findMany({
        where: {
          service,
          status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
        },
      });

      for (const incident of openIncidents) {
        await this.prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedBy: 'auto-recovery',
          },
        });
        this.logger.log(`[Monitoring] Toparlanma tespit edildi: ${incident.incidentCode}`);
      }
    } catch (err) {
      this.logger.error('[Monitoring] Toparlanma kaydedilemedi:', err);
    }
  }

  // ── Listeleme / Dashboard ─────────────────────────────────────

  async listIncidents(query: {
    page?: number;
    pageSize?: number;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    category?: IncidentCategory;
    service?: string;
    from?: string;
    to?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);

    const where: Prisma.IncidentWhereInput = {};
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.service) where.service = query.service;
    if (query.from || query.to) {
      where.firstSeenAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        orderBy: [
          // CRITICAL en üste, sonra firstSeenAt desc
          { severity: 'asc' }, // CRITICAL < ERROR < WARNING < HEALTHY alfab. sırası olmadığı için manuel sıralama yaparız
          { firstSeenAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          incidentCode: true,
          severity: true,
          status: true,
          category: true,
          service: true,
          module: true,
          endpoint: true,
          title: true,
          summary: true,
          affectedScope: true,
          occurrenceCount: true,
          firstSeenAt: true,
          lastSeenAt: true,
          resolvedAt: true,
          notificationStatus: true,
          correlationId: true,
          _count: { select: { occurrences: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    // Severity'ye göre manuel sıralama (CRITICAL en üste)
    const severityOrder: Record<IncidentSeverity, number> = {
      CRITICAL: 0,
      ERROR: 1,
      WARNING: 2,
      HEALTHY: 3,
    };
    const sorted = items.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return { items: sorted, total, page, pageSize };
  }

  async getIncidentDetail(id: string) {
    return this.prisma.incident.findUnique({
      where: { id },
      include: {
        occurrences: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
          select: {
            id: true,
            occurredAt: true,
            errorCode: true,
            errorSummary: true,
            httpStatus: true,
            latencyMs: true,
            source: true,
          },
        },
        notifications: {
          select: {
            id: true,
            channel: true,
            recipient: true,
            status: true,
            sentAt: true,
            retryCount: true,
          },
        },
      },
    });
  }

  async getDashboardSummary() {
    const [criticalCount, errorCount, warningCount, openCount, lastIncident, health] =
      await Promise.all([
        this.prisma.incident.count({
          where: { severity: IncidentSeverity.CRITICAL, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.incident.count({
          where: { severity: IncidentSeverity.ERROR, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.incident.count({
          where: { severity: IncidentSeverity.WARNING, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.incident.count({
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.incident.findFirst({
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
          orderBy: [{ severity: 'asc' }, { firstSeenAt: 'desc' }],
          select: {
            incidentCode: true,
            severity: true,
            title: true,
            firstSeenAt: true,
          },
        }),
        this.getLastHealthSnapshot(),
      ]);

    const overallSeverity: IncidentSeverity | 'HEALTHY' =
      criticalCount > 0
        ? IncidentSeverity.CRITICAL
        : errorCount > 0
          ? IncidentSeverity.ERROR
          : warningCount > 0
            ? IncidentSeverity.WARNING
            : 'HEALTHY';

    return {
      criticalCount,
      errorCount,
      warningCount,
      openCount,
      overallSeverity,
      lastIncident,
      health,
    };
  }

  async acknowledgeIncident(id: string): Promise<void> {
    await this.prisma.incident.update({
      where: { id },
      data: { status: IncidentStatus.ACKNOWLEDGED },
    });
  }

  async resolveIncident(id: string, resolvedBy = 'manual'): Promise<void> {
    await this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async getHealthHistory(service?: string, limit = 50) {
    const safeLimit = Math.min(limit, 200);
    return this.prisma.healthCheckResult.findMany({
      where: service ? { service } : undefined,
      orderBy: { checkedAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        service: true,
        status: true,
        latencyMs: true,
        checkedAt: true,
        errorCode: true,
        checkSource: true,
      },
    });
  }

  // ── Yardımcılar ───────────────────────────────────────────────

  private async generateIncidentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.incident.count();
    this.incidentCounter = count + 1;
    return `INC-${year}-${String(this.incidentCounter).padStart(5, '0')}`;
  }

  private higherSeverity(a: IncidentSeverity, b: IncidentSeverity): IncidentSeverity {
    const order: Record<IncidentSeverity, number> = {
      CRITICAL: 0,
      ERROR: 1,
      WARNING: 2,
      HEALTHY: 3,
    };
    return order[a] <= order[b] ? a : b;
  }

  private sanitizeMessage(msg: string): string {
    // Token, email, UUID, secret benzeri kalıpları maskele
    return msg
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [MASKED]')
      .replace(/password[^\s,}]*/gi, 'password=[MASKED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g, '[EMAIL]')
      .slice(0, 1000);
  }
}
