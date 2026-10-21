import { api } from '@/lib/api';

// ── Tipler ───────────────────────────────────────────────────────

export type IncidentSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'HEALTHY';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';
export type IncidentCategory =
  | 'AVAILABILITY'
  | 'PERFORMANCE'
  | 'FUNCTIONAL_ERROR'
  | 'SECURITY'
  | 'DATABASE'
  | 'CACHE'
  | 'EXTERNAL_SERVICE'
  | 'CLIENT_ERROR'
  | 'MONITORING';

export interface Incident {
  id: string;
  incidentCode: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  service: string;
  module?: string | null;
  endpoint?: string | null;
  title: string;
  summary: string;
  affectedScope?: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string | null;
  notificationStatus: string;
  correlationId?: string | null;
  _count?: { occurrences: number };
}

export interface IncidentOccurrence {
  id: string;
  occurredAt: string;
  errorCode?: string | null;
  errorSummary?: string | null;
  httpStatus?: number | null;
  latencyMs?: number | null;
  source?: string | null;
}

export interface IncidentDetail extends Incident {
  occurrences: IncidentOccurrence[];
  notifications: Array<{
    id: string;
    channel: string;
    recipient: string;
    status: string;
    sentAt?: string | null;
    retryCount: number;
  }>;
}

export interface ServiceHealth {
  service: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  checkedAt: string;
  errorCode?: string;
}

export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down' | 'MONITORING_UNKNOWN';
  services: ServiceHealth[];
  checkedAt: string;
  stale: boolean;
}

export interface HealthCheckResult {
  id: string;
  service: string;
  status: string;
  latencyMs?: number | null;
  checkedAt: string;
  errorCode?: string | null;
  checkSource: string;
}

export interface MonitoringDashboardSummary {
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  openCount: number;
  overallSeverity: IncidentSeverity | 'HEALTHY';
  lastIncident?: {
    incidentCode: string;
    severity: IncidentSeverity;
    title: string;
    firstSeenAt: string;
  } | null;
  health: HealthSnapshot;
}

export interface IncidentListResult {
  items: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Etiketler ────────────────────────────────────────────────────

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  CRITICAL: 'Kritik Hata',
  ERROR: 'Hata',
  WARNING: 'Uyarı',
  HEALTHY: 'Sorun Yok',
};

export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  CRITICAL: '#ef4444',   // kırmızı
  ERROR: '#a855f7',      // mor
  WARNING: '#eab308',    // sarı
  HEALTHY: '#22c55e',    // yeşil
};

export const SEVERITY_BG: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-400',
  ERROR: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  WARNING: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  HEALTHY: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: 'Açık',
  ACKNOWLEDGED: 'İnceleniyor',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapatıldı',
};

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  AVAILABILITY: 'Erişilebilirlik',
  PERFORMANCE: 'Performans',
  FUNCTIONAL_ERROR: 'İşlevsel Hata',
  SECURITY: 'Güvenlik',
  DATABASE: 'Veritabanı',
  CACHE: 'Cache',
  EXTERNAL_SERVICE: 'Harici Servis',
  CLIENT_ERROR: 'Tarayıcı Hatası',
  MONITORING: 'İzleme Sistemi',
};

export const SERVICE_LABEL: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend API',
  database: 'Veritabanı',
  redis: 'Redis Cache',
  external: 'Harici Servis',
};

export const HEALTH_STATUS_LABEL: Record<string, string> = {
  ok: 'Sağlıklı',
  degraded: 'Kısmi Sorun',
  down: 'Erişilemiyor',
  unknown: 'Bilinmiyor',
  MONITORING_UNKNOWN: 'İzleme Verisi Alınamıyor',
};

// ── API Çağrıları ─────────────────────────────────────────────────

export const monitoringApi = {
  summary: () =>
    api<MonitoringDashboardSummary>('/api/monitoring/summary'),

  runHealthCheck: () =>
    api<HealthSnapshot>('/api/monitoring/health/check', { method: 'POST' }),

  healthSnapshot: () =>
    api<HealthSnapshot>('/api/monitoring/health'),

  healthHistory: (service?: string, limit?: number) =>
    api<HealthCheckResult[]>('/api/monitoring/health/history', {
      query: { ...(service ? { service } : {}), ...(limit ? { limit } : {}) },
    }),

  listIncidents: (params?: {
    page?: number;
    pageSize?: number;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    category?: IncidentCategory;
    service?: string;
    from?: string;
    to?: string;
  }) => api<IncidentListResult>('/api/monitoring/incidents', { query: { ...params } }),

  getIncident: (id: string) =>
    api<IncidentDetail>(`/api/monitoring/incidents/${id}`),

  acknowledge: (id: string) =>
    api<void>(`/api/monitoring/incidents/${id}/acknowledge`, { method: 'PATCH' }),

  resolve: (id: string) =>
    api<void>(`/api/monitoring/incidents/${id}/resolve`, { method: 'PATCH' }),

  reportClientError: (params: {
    message: string;
    route?: string;
    module?: string;
    correlationId?: string;
  }) =>
    api<void>('/api/monitoring/client-error', {
      method: 'POST',
      body: params,
    }).catch(() => {
      // Hata raporu gönderilemezse sessizce geç — uygulama durmamalı
    }),
};
