import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

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

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const { data, isLoading } = useCounts();

  const stats = [
    { label: 'Personel', value: data?.personel, to: '/personel', icon: Users },
    { label: 'Departman', value: data?.departman, to: '/organizasyon', icon: Building2 },
    { label: 'Birim', value: data?.birim, to: '/organizasyon', icon: Building2 },
    { label: 'Rol', value: data?.rol, to: '/roller', icon: ShieldCheck },
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
                {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-semibold">{stat.value ?? 0}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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