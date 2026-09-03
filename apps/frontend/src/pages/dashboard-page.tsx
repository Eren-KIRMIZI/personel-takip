import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock4,
  Lightbulb,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { reportsApi } from '@/features/raporlar/api';
import { cn } from '@/lib/utils';

/* ── Stat card ──────────────────────────────── */
interface StatCardProps {
  label: string;
  value?: number;
  to: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading?: boolean;
}

function StatCard({ label, value, to, icon: Icon, color, bgColor, loading }: StatCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-14" />
              ) : (
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {value ?? 0}
                </p>
              )}
            </div>
            <div className={cn('flex size-10 items-center justify-center rounded-xl', bgColor)}>
              <Icon className={cn('size-5', color)} />
            </div>
          </div>
          <div className={cn('mt-4 flex items-center gap-1 text-xs font-medium', color)}>
            <span>Görüntüle</span>
            <ArrowRight className="size-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ── Activity metric ────────────────────────── */
interface MetricProps {
  icon: React.ElementType;
  label: string;
  value?: number;
  sub: string;
  to: string;
  accent?: string;
}

function ActivityMetric({ icon: Icon, label, value, sub, to, accent = 'text-primary' }: MetricProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent">
        <Icon className={cn('size-5', accent)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value ?? 0}</p>
        <p className="text-xs font-medium text-foreground/80">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

/* ── Main Dashboard ─────────────────────────── */
export function DashboardPage() {
  const profile       = useAuthStore((s) => s.profile);
  const session       = useAuthStore((s) => s.session);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const navigate      = useNavigate();

  // Tek API çağrısı — artık 4 ayrı istek yok
  const { data, isLoading } = useQuery({
    queryKey: ['raporlar', 'summary'],
    queryFn: () => reportsApi.summary(),
    // Stat sayıları 2 dakika boyunca taze sayılır
    staleTime: 2 * 60 * 1000,
  });

  const displayName =
    session?.user.user_metadata?.full_name ??
    profile?.email ??
    profile?.username ??
    'Kullanıcı';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  const statCards = [
    { label: 'Toplam Personel', value: data?.employeesTotal,    to: '/personel',     icon: Users,       color: 'text-blue-600',    bgColor: 'bg-blue-50' },
    { label: 'Departman',       value: data?.departmentsTotal,  to: '/organizasyon', icon: Building2,   color: 'text-violet-600',  bgColor: 'bg-violet-50' },
    { label: 'Birim',           value: data?.unitsTotal,        to: '/organizasyon', icon: TrendingUp,  color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Rol Tanımı',      value: data?.rolesTotal,        to: '/roller',       icon: ShieldCheck, color: 'text-orange-600',  bgColor: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ── Hero Greeting ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground font-display">
            {greeting}, <span className="text-primary">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {profile?.roles?.length ? ` · ${profile.roles.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/qr-okut')}
            className="gap-2"
            id="dashboard-qr-scan-btn"
          >
            <QrCode className="size-4" />
            QR Okut
          </Button>
          <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 status-dot-active" />
            Sistem Aktif
          </Badge>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} loading={isLoading} />
        ))}
      </div>

      {/* ── Today's Overview ────────────────────────── */}
      {data && hasPermission('attendance:read') && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Bugünkü Genel Bakış
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActivityMetric
              icon={CheckCircle2}
              label="Bugün İçeride"
              value={data.presentToday}
              sub={`${data.employeesActive} aktif personel`}
              to="/giris-cikis"
              accent="text-emerald-600"
            />
            <ActivityMetric
              icon={CalendarClock}
              label="Bekleyen İzin"
              value={data.pendingLeaves}
              sub="onay bekliyor"
              to="/izin"
              accent="text-amber-600"
            />
            <ActivityMetric
              icon={Clock4}
              label="Bekleyen Mesai"
              value={data.pendingOvertimes}
              sub="onay bekliyor"
              to="/mesai"
              accent="text-blue-600"
            />
            <ActivityMetric
              icon={Lightbulb}
              label="Aylık Mesai"
              value={data.approvedOvertimeHoursMonth}
              sub="onaylı saat"
              to="/mesai"
              accent="text-violet-600"
            />
          </div>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Hızlı İşlemler
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/personel/yeni', label: 'Personel Ekle',  icon: Users,         desc: 'Yeni çalışan kaydı oluştur' },
            { to: '/izin/yeni',     label: 'İzin Talebi',    icon: CalendarClock, desc: 'Yeni izin talebi oluştur' },
            { to: '/mesai/yeni',    label: 'Mesai Ekle',     icon: Zap,           desc: 'Fazla mesai kaydı ekle' },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <q.icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{q.label}</p>
                <p className="text-xs text-muted-foreground">{q.desc}</p>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Permissions overview ─────────────────────── */}
      {profile?.permissions?.length ? (
        <details className="group">
          <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ShieldCheck className="size-4" />
            Tanımlı Yetkiler
            <span className="ml-auto text-xs text-muted-foreground/60 group-open:hidden">göster</span>
          </summary>
          <Card>
            <CardContent className="flex flex-wrap gap-1.5 p-4">
              {profile.permissions.map((p) => (
                <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                  {p}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </details>
      ) : null}
    </div>
  );
}