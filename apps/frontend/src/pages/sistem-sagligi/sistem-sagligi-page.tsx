import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Server,
  Shield,
  XCircle,
  Zap,
  Info,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  monitoringApi,
  SEVERITY_LABEL,
  SEVERITY_BG,
  STATUS_LABEL,
  CATEGORY_LABEL,
  SERVICE_LABEL,
  HEALTH_STATUS_LABEL,
  type Incident,
  type IncidentSeverity,
  type HealthSnapshot,
} from '@/features/monitoring/api';

// ── Severity icon ─────────────────────────────────────────────────
function SeverityIcon({ severity, size = 'md' }: { severity: IncidentSeverity; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-3.5' : 'size-4';
  if (severity === 'CRITICAL') return <XCircle className={cn(cls, 'text-red-400')} />;
  if (severity === 'ERROR') return <AlertTriangle className={cn(cls, 'text-purple-400')} />;
  if (severity === 'WARNING') return <AlertTriangle className={cn(cls, 'text-yellow-400')} />;
  return <CheckCircle2 className={cn(cls, 'text-emerald-400')} />;
}

// ── Health durum kartı ────────────────────────────────────────────
function ServiceHealthCard({ service, status, latencyMs }: { service: string; status: string; latencyMs?: number }) {
  const isOk = status === 'ok';
  const isDegraded = status === 'degraded';
  const isDown = status === 'down';

  const icon =
    service === 'database' ? <Database className="size-4" /> :
    service === 'redis' ? <Zap className="size-4" /> :
    <Server className="size-4" />;

  const color = isOk
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : isDegraded
      ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      : isDown
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : 'text-muted-foreground bg-muted/30 border-border';

  return (
    <div className={cn('flex items-center justify-between rounded-xl border p-3', color)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{SERVICE_LABEL[service] ?? service}</span>
      </div>
      <div className="text-right">
        <div className="text-xs font-semibold">{HEALTH_STATUS_LABEL[status] ?? status}</div>
        {latencyMs !== undefined && (
          <div className="text-[10px] opacity-70">{latencyMs}ms</div>
        )}
      </div>
    </div>
  );
}

// ── Olay satırı ───────────────────────────────────────────────────
function IncidentRow({
  incident,
  onSelect,
  onAcknowledge,
  onResolve,
}: {
  incident: Incident;
  onSelect: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const isActive = incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED';

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        incident.severity === 'CRITICAL'
          ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
          : incident.severity === 'ERROR'
            ? 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10'
            : incident.severity === 'WARNING'
              ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
              : 'border-border bg-card hover:bg-accent/30',
      )}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon severity={incident.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{incident.incidentCode}</span>
            <Badge variant="outline" className={cn('text-[10px] border', SEVERITY_BG[incident.severity])}>
              {SEVERITY_LABEL[incident.severity]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {STATUS_LABEL[incident.status]}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {CATEGORY_LABEL[incident.category]}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{incident.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{incident.summary}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(incident.firstSeenAt).toLocaleString('tr-TR')}
            </span>
            <span>Tekrar: {incident.occurrenceCount}x</span>
            {incident.service && (
              <span className="flex items-center gap-1">
                <Server className="size-3" />
                {SERVICE_LABEL[incident.service] ?? incident.service}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelect(incident.id)}>
            <Eye className="mr-1 size-3" />
            Detay
          </Button>
          {isActive && incident.status === 'OPEN' && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10" onClick={() => onAcknowledge(incident.id)}>
              İncele
            </Button>
          )}
          {isActive && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onResolve(incident.id)}>
              Çözüldü
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Olay Detay Paneli ────────────────────────────────────────────
function IncidentDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['incident-detail', id],
    queryFn: () => monitoringApi.getIncident(id),
  });

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SeverityIcon severity={data.severity} size="lg" />
          <div>
            <div className="text-xs font-mono text-muted-foreground">{data.incidentCode}</div>
            <h2 className="text-base font-bold">{data.title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Durum', STATUS_LABEL[data.status]],
          ['Severity', SEVERITY_LABEL[data.severity]],
          ['Servis', SERVICE_LABEL[data.service] ?? data.service],
          ['Kategori', CATEGORY_LABEL[data.category]],
          ['İlk Görülme', new Date(data.firstSeenAt).toLocaleString('tr-TR')],
          ['Son Görülme', new Date(data.lastSeenAt).toLocaleString('tr-TR')],
          ['Tekrar Sayısı', String(data.occurrenceCount)],
          ['Etki Kapsamı', data.affectedScope ?? '—'],
          ...(data.resolvedAt ? [['Çözülme', new Date(data.resolvedAt).toLocaleString('tr-TR')]] : []),
          ...(data.correlationId ? [['Korelasyon ID', data.correlationId]] : []),
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-muted/30 p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="font-medium mt-0.5 truncate">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Özet</div>
        <p className="text-sm">{data.summary}</p>
      </div>

      {data.occurrences.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Son Oluşumlar ({data.occurrences.length})
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {data.occurrences.map((occ) => (
              <div key={occ.id} className="rounded-lg border border-border bg-muted/20 p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{new Date(occ.occurredAt).toLocaleString('tr-TR')}</span>
                  {occ.httpStatus && <span className="font-mono text-yellow-400">HTTP {occ.httpStatus}</span>}
                  {occ.latencyMs && <span className="text-muted-foreground">{occ.latencyMs}ms</span>}
                </div>
                {occ.errorSummary && <div className="mt-0.5 text-muted-foreground">{occ.errorSummary}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.notifications.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bildirimler</div>
          <div className="space-y-1.5">
            {data.notifications.map((n) => (
              <div key={n.id} className="flex justify-between rounded-lg border border-border bg-muted/20 p-2 text-xs">
                <span>{n.channel} → {n.recipient}</span>
                <span className={n.status === 'sent' ? 'text-emerald-400' : 'text-muted-foreground'}>{n.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ana Sayfa ────────────────────────────────────────────────────
export function SistemSagligiPage() {
  const queryClient = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterService, setFilterService] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Dashboard özeti
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monitoring-summary'],
    queryFn: () => monitoringApi.summary(),
    refetchInterval: 60_000,
  });

  // Olay listesi
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['monitoring-incidents', filterSeverity, filterStatus, filterService, page],
    queryFn: () =>
      monitoringApi.listIncidents({
        page,
        pageSize: PAGE_SIZE,
        severity: filterSeverity as any || undefined,
        status: filterStatus as any || undefined,
        service: filterService || undefined,
      }),
    refetchInterval: 30_000,
  });

  const healthCheckMutation = useMutation({
    mutationFn: () => monitoringApi.runHealthCheck(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitoring-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['monitoring-incidents'] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => monitoringApi.acknowledge(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitoring-incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['monitoring-summary'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => monitoringApi.resolve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitoring-incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['monitoring-summary'] });
    },
  });

  const health = summary?.health;
  const isStale = health?.stale;

  // Kritik olaylar (listenin en üstünde ayrı gösterilecek)
  const criticalItems = incidents?.items.filter(
    (i) => i.severity === 'CRITICAL' && (i.status === 'OPEN' || i.status === 'ACKNOWLEDGED'),
  ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem Sağlığı"
        description="Otomatik izleme, olay tespiti ve yazılım ekibine bildirim"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => healthCheckMutation.mutate()}
            disabled={healthCheckMutation.isPending}
          >
            <RefreshCw className={cn('mr-2 size-4', healthCheckMutation.isPending && 'animate-spin')} />
            Sağlık Kontrolü
          </Button>
        }
      />

      {/* ── Stale Uyarı ── */}
      {isStale && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span><strong>İzleme verisi güncel değil.</strong> Son başarılı kontrol 2 dakikadan eski — sistemi sağlıklı varsayma.</span>
        </div>
      )}

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <SummaryCard
              label="Kritik Hata"
              count={summary?.criticalCount ?? 0}
              color="text-red-400"
              bg="bg-red-500/10 border-red-500/20"
              icon={<XCircle className="size-5 text-red-400" />}
              sublabel="Acil inceleme"
            />
            <SummaryCard
              label="Hata"
              count={summary?.errorCount ?? 0}
              color="text-purple-400"
              bg="bg-purple-500/10 border-purple-500/20"
              icon={<AlertTriangle className="size-5 text-purple-400" />}
              sublabel="İnceleme bekliyor"
            />
            <SummaryCard
              label="Uyarı"
              count={summary?.warningCount ?? 0}
              color="text-yellow-400"
              bg="bg-yellow-500/10 border-yellow-500/20"
              icon={<AlertTriangle className="size-5 text-yellow-400" />}
              sublabel="Takip edilmeli"
            />
            <SystemStatusCard health={health} overallSeverity={summary?.overallSeverity} />
          </>
        )}
      </div>

      {/* ── Servis Sağlığı ── */}
      {health && health.status !== 'MONITORING_UNKNOWN' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                Servis Durumları
              </h2>
              <span className="text-[10px] text-muted-foreground">
                Son kontrol: {new Date(health.checkedAt).toLocaleTimeString('tr-TR')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {health.services.map((svc) => (
                <ServiceHealthCard key={svc.service} {...svc} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KRİTİK OLAYLAR (en üstte ayrı bölüm) ── */}
      {criticalItems.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="size-3.5 text-red-400" />
            </div>
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">
              Kritik Olaylar — Acil İnceleme Gerekiyor
            </h2>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
              {criticalItems.length}
            </span>
          </div>
          <div className="space-y-2">
            {criticalItems.map((inc) => (
              <IncidentRow
                key={inc.id}
                incident={inc}
                onSelect={setSelectedId}
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                onResolve={(id) => resolveMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filtreler ── */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
          className="w-36 text-sm"
        >
          <option value="">Tüm Seviyeler</option>
          <option value="CRITICAL">Kritik Hata</option>
          <option value="ERROR">Hata</option>
          <option value="WARNING">Uyarı</option>
          <option value="HEALTHY">Sorun Yok</option>
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="w-36 text-sm"
        >
          <option value="">Tüm Durumlar</option>
          <option value="OPEN">Açık</option>
          <option value="ACKNOWLEDGED">İnceleniyor</option>
          <option value="RESOLVED">Çözüldü</option>
          <option value="CLOSED">Kapatıldı</option>
        </Select>
        <Select
          value={filterService}
          onChange={(e) => { setFilterService(e.target.value); setPage(1); }}
          className="w-36 text-sm"
        >
          <option value="">Tüm Servisler</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend API</option>
          <option value="database">Veritabanı</option>
          <option value="redis">Redis</option>
        </Select>
      </div>

      {/* ── Diğer Olaylar ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          Tüm Olaylar
          {incidents?.total !== undefined && (
            <span className="text-xs text-muted-foreground">({incidents.total})</span>
          )}
        </h2>

        {incidentsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (incidents?.items.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 py-12">
            <CheckCircle2 className="size-10 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">Aktif olay bulunmuyor</p>
            <p className="text-xs text-muted-foreground">Tüm servisler normal çalışıyor</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents!.items.map((inc) => (
              <IncidentRow
                key={inc.id}
                incident={inc}
                onSelect={setSelectedId}
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                onResolve={(id) => resolveMutation.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {(incidents?.total ?? 0) > PAGE_SIZE && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Önceki
            </Button>
            <span className="flex items-center px-3 text-xs text-muted-foreground">
              {page} / {Math.ceil((incidents?.total ?? 1) / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil((incidents?.total ?? 1) / PAGE_SIZE)}
              onClick={() => setPage(p => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        )}
      </div>

      {/* ── Detay Panel (slide-over) ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedId(null)}>
          <div
            className="relative h-full w-full max-w-lg overflow-y-auto bg-card border-l border-border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <IncidentDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Özet kart bileşeni ───────────────────────────────────────────
function SummaryCard({
  label, count, color, bg, icon, sublabel,
}: {
  label: string; count: number; color: string; bg: string; icon: React.ReactNode; sublabel: string;
}) {
  return (
    <Card className={cn('border', bg)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          <span className={cn('text-3xl font-bold', color)}>{count}</span>
        </div>
        <div className={cn('text-xs font-semibold', color)}>{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</div>
      </CardContent>
    </Card>
  );
}

// ── Sistem Durumu kartı ───────────────────────────────────────────
function SystemStatusCard({
  health,
  overallSeverity,
}: {
  health?: HealthSnapshot;
  overallSeverity?: string;
}) {
  const isUnknown = !health || health.status === 'MONITORING_UNKNOWN';
  const isOk = overallSeverity === 'HEALTHY' && !isUnknown;
  const color = isUnknown
    ? 'text-muted-foreground bg-muted/30 border-border'
    : isOk
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : overallSeverity === 'CRITICAL'
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : overallSeverity === 'ERROR'
          ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
          : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';

  return (
    <Card className={cn('border', color)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {isOk ? <CheckCircle2 className="size-5" /> : isUnknown ? <Info className="size-5" /> : <XCircle className="size-5" />}
        </div>
        <div className="text-xs font-semibold">Sistem Durumu</div>
        <div className="text-sm font-bold mt-0.5">
          {isUnknown ? 'Bilinmiyor' : isOk ? 'İzleniyor' : SEVERITY_LABEL[overallSeverity as IncidentSeverity] ?? 'Sorunlu'}
        </div>
        {health && !isUnknown && (
          <div className="text-[10px] opacity-70 mt-0.5">
            Son: {new Date(health.checkedAt).toLocaleTimeString('tr-TR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
