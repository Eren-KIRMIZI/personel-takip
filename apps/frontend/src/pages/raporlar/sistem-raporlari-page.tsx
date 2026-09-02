import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { assetApi } from '@/features/zimmet/api';
import { taskApi, TASK_STATUS_META, TASK_PRIORITY_META } from '@/features/gorev/api';
import { documentApi, DOCUMENT_STATUS_META } from '@/features/evrak/api';
import { Briefcase, Package, FileText, CheckCircle2, CircleDashed, AlertCircle } from 'lucide-react';

function StatCard({ title, value, icon, description, loading }: { title: string; value: string | number; icon: React.ReactNode; description?: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function SistemRaporlariPage() {
  const { data: assetStats, isLoading: loadingAssets } = useQuery({ queryKey: ['asset-stats'], queryFn: () => assetApi.getStats() });
  const { data: taskStats, isLoading: loadingTasks } = useQuery({ queryKey: ['task-stats'], queryFn: () => taskApi.getStats() });
  const { data: docStats, isLoading: loadingDocs } = useQuery({ queryKey: ['document-stats'], queryFn: () => documentApi.getStats() });

  const tasksTodo = taskStats?.byStatus.find(s => s.status === 'TODO')?.count ?? 0;
  const tasksInProgress = taskStats?.byStatus.find(s => s.status === 'IN_PROGRESS')?.count ?? 0;
  const tasksDone = taskStats?.byStatus.find(s => s.status === 'DONE')?.count ?? 0;

  const assetsAssigned = assetStats?.byStatus.find(s => s.status === 'ASSIGNED')?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem ve İş Süreçleri Raporları"
        description="Görev, Zimmet ve Evrak modüllerinin genel istatistikleri"
      />

      {/* Üst Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Toplam Görev" 
          value={taskStats?.total ?? 0} 
          icon={<Briefcase className="h-4 w-4" />} 
          description={`${tasksDone} tamamlandı, ${tasksTodo + tasksInProgress} devam ediyor`}
          loading={loadingTasks} 
        />
        <StatCard 
          title="Dağıtılan Zimmetler" 
          value={assetsAssigned} 
          icon={<Package className="h-4 w-4" />} 
          description={`Toplam ${assetStats?.total ?? 0} kayıttan ${assetsAssigned} tanesi personelde kullanımda`}
          loading={loadingAssets} 
        />
        <StatCard 
          title="Toplam Evrak" 
          value={docStats?.total ?? 0} 
          icon={<FileText className="h-4 w-4" />} 
          description="Sistemdeki tüm gelen/giden evraklar"
          loading={loadingDocs} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Görev Dağılımı */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Görev Durumları</CardTitle>
            <CardDescription>Aktif ve tamamlanan görevlerin dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : (
              <div className="space-y-4">
                {taskStats?.byStatus.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.status === 'DONE' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-amber-500" />}
                      <span className="text-sm font-medium">{TASK_STATUS_META[stat.status]?.label ?? stat.status}</span>
                    </div>
                    <span className="font-bold">{stat.count}</span>
                  </div>
                ))}
                {(!taskStats?.byStatus || taskStats.byStatus.length === 0) && (
                  <span className="text-sm text-muted-foreground">Kayıt yok</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Görev Öncelikleri */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Görev Öncelikleri</CardTitle>
            <CardDescription>Görevlerin aciliyet seviyeleri</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : (
              <div className="space-y-4">
                {taskStats?.byPriority.map((stat) => (
                  <div key={stat.priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{TASK_PRIORITY_META[stat.priority]?.label ?? stat.priority}</span>
                    </div>
                    <span className="font-bold">{stat.count}</span>
                  </div>
                ))}
                {(!taskStats?.byPriority || taskStats.byPriority.length === 0) && (
                  <span className="text-sm text-muted-foreground">Kayıt yok</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evrak Durumları */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Evrak Durumları</CardTitle>
            <CardDescription>İşlemdeki ve tamamlanan evraklar</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDocs ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : (
              <div className="space-y-4">
                {docStats?.byStatus.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <div className="text-sm font-medium">{DOCUMENT_STATUS_META[stat.status]?.label ?? stat.status}</div>
                    <span className="font-bold">{stat.count}</span>
                  </div>
                ))}
                {(!docStats?.byStatus || docStats.byStatus.length === 0) && (
                  <span className="text-sm text-muted-foreground">Kayıt yok</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zimmet Kategorileri */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Kategori Bazlı Zimmetler</CardTitle>
            <CardDescription>Hangi kategoride ne kadar malzeme var</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAssets ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {assetStats?.byCategory.map((stat) => (
                  <div key={stat.category || 'Belirsiz'} className="flex flex-col gap-1 p-4 rounded-lg bg-accent/50">
                    <span className="text-sm text-muted-foreground">{stat.category || 'Belirsiz'}</span>
                    <span className="text-2xl font-semibold">{stat.count}</span>
                  </div>
                ))}
                {(!assetStats?.byCategory || assetStats.byCategory.length === 0) && (
                  <span className="text-sm text-muted-foreground">Kayıtlı kategori bulunamadı</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
