import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  Clock4,
  Lightbulb,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { reportsApi, type DashboardSummary } from '@/features/raporlar/api';

interface CountRow {
  items: unknown[];
  total: number;
}

function useCounts() {
  const countQuery = async (path: string) => api<CountRow>(path, { query: { pageSize: 1 } });
  return useQuery({
    queryKey: ['dashboard', 'counts'],
    queryFn: async () => {
      const count = async (path: string) => {
        const res = await countQuery(path);
        return res instanceof Array ? res.length : res.total;
      };
      const [personel, departman, birim, rol] = await Promise.all([
        count('/api/employees'),
        count('/api/departments'),
        count('/api/units'),
        count('/api/roles'),
      ]);
      return { personel, departman, birim, rol };
    },
  });
}

function useCheckInSummary() {
  return useQuery({
    queryKey: ['raporlar', 'summary'],
    queryFn: () => reportsApi.summary(),
  });
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const counts = useCounts();
  const check = useCheckInSummary();

  const stats = [
    { label: 'Personel', value: counts.data?.personel, to: '/personel', icon: Users },
    { label: 'Departman', value: counts.data?.departman, to: '/organizasyon', icon: Building2 },
    { label: 'Birim', value: counts.data?.birim, to: '/organizasyon', icon: Building2 },
    { label: 'Rol', value: counts.data?.rol, to: '/roller', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel</h1>
        <p className="text-sm text-muted-foreground">
          Hoş geldiniz, <span className="font-medium text-foreground">{profile?.email ?? profile?.username}</span> —{' '}
          {profile?.roles.length ? `Roller: ${profile.roles.join(', ')}` : 'Rol atanmamış'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {counts.isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-semibold">{stat.value ?? 0}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {check.data && hasPermission('attendance:read') && (
        <CheckInSummaryCard data={check.data} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Yetkiniz</CardTitle>
          <CardDescription>Bu kullanıcı için tanımlı yetkiler</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {profile?.permissions.length ? (
            profile.permissions.map((p) => (
              <Badge key={p} variant="secondary">
                {p}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Yetki tanımlanmamış. Yöneticinize başvurun.</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckInSummaryCard({ data }: { data: DashboardSummary }) {
  const rows = [
    {
      icon: ClipboardCheck,
      label: 'Bugün İçeride',
      value: data.presentToday,
      sub: `${data.employeesActive} aktif personel`,
      to: '/giris-cikis',
      show: true,
    },
    {
      icon: CalendarClock,
      label: 'Bekleyen İzin',
      value: data.pendingLeaves,
      sub: 'onay bekleyen',
      to: '/izin',
      show: true,
    },
    {
      icon: Clock4,
      label: 'Bekleyen Mesai',
      value: data.pendingOvertimes,
      sub: 'onay bekleyen',
      to: '/mesai',
      show: true,
    },
    {
      icon: Lightbulb,
      label: 'Ay Mesaisi (onaylı)',
      value: data.approvedOvertimeHoursMonth,
      sub: 'saat',
      to: '/mesai',
      show: true,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Bugünkü Genel Bakış</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <Link key={row.label} to={row.to} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50">
            <row.icon className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold">{row.value ?? 0}</div>
              <div className="text-xs font-medium">{row.label}</div>
              <div className="text-xs text-muted-foreground">{row.sub}</div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}