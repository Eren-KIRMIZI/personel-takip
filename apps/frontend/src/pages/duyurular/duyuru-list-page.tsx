import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Bell, Megaphone, Check } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import { announcementApi, ANNOUNCEMENT_STATUS_META, ANNOUNCEMENT_TARGET_META } from '@/features/duyuru/api';
import { formatDateTime } from '@/lib/utils';

function AdminFeed() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['announcements-admin', page],
    queryFn: () => announcementApi.list({ page, pageSize: 15 }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tüm Duyurular (Yönetim)</CardTitle>
        <CardDescription>Sistemde oluşturulan tüm duyurular ve okunma istatistikleri</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : data && data.items.length > 0 ? (
          <div className="space-y-4">
            {data.items.map(a => (
              <div key={a.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{a.title}</h3>
                    <Badge 
                      variant={ANNOUNCEMENT_STATUS_META[a.status].variant} 
                    >
                      {ANNOUNCEMENT_STATUS_META[a.status].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Yayına Giriş: {formatDateTime(a.publishAt)}</span>
                    <span>Bitiş: {formatDateTime(a.expireAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant="outline">{ANNOUNCEMENT_TARGET_META[a.targetType]}</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Okunma: {a._count?.reads ?? 0}
                    {a.targetType === 'SPECIFIC' && ` / ${a._count?.targetEmployees ?? 0}`}
                  </div>
                </div>
              </div>
            ))}
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Megaphone className="mx-auto h-8 w-8 opacity-20 mb-2" />
            Henüz duyuru oluşturulmamış
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmployeeFeed() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['announcements-my', page],
    queryFn: () => announcementApi.listMy(page, 15),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => announcementApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements-my'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duyurularım</CardTitle>
        <CardDescription>Size özel ve kurum geneli aktif duyurular</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : data && data.items.length > 0 ? (
          <div className="space-y-4">
            {data.items.map(a => (
              <div key={a.id} className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between ${!a.isRead ? 'bg-primary/5 border-primary/20' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {!a.isRead && <span className="flex h-2 w-2 rounded-full bg-primary" />}
                    <h3 className={`text-lg ${!a.isRead ? 'font-bold' : 'font-medium text-muted-foreground'}`}>{a.title}</h3>
                    <span className="text-xs text-muted-foreground">{formatDateTime(a.publishAt)}</span>
                  </div>
                  <p className={`text-sm ${!a.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{a.content}</p>
                </div>
                <div className="shrink-0">
                  {!a.isRead ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(a.id)}
                    >
                      <Check className="mr-2 h-4 w-4" /> Okudum
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Okundu: {formatDateTime(a.readAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="mx-auto h-8 w-8 opacity-20 mb-2" />
            Aktif duyuru bulunmuyor
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DuyuruListPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const tabs = [
    { value: 'feed', label: 'Duyurularım', content: <EmployeeFeed /> },
  ];

  if (hasPermission('announcement:read')) {
    tabs.push({ value: 'admin', label: 'Tüm Duyurular (Yönetim)', content: <AdminFeed /> });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duyuru Yönetimi"
        description="Kurum içi duyurular ve bildirimler"
        actions={
          hasPermission('announcement:write') ? (
            <Link to="/duyurular/yeni" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Duyuru
            </Link>
          ) : undefined
        }
      />

      <Tabs tabs={tabs} />
    </div>
  );
}
