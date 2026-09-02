import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { taskApi, TASK_STATUS_META, TASK_PRIORITY_META, type TaskStatus, type TaskPriority } from '@/features/gorev/api';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

export function GorevListPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', status, priority, search, page],
    queryFn: () =>
      taskApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: (status || undefined) as TaskStatus | undefined,
        priority: (priority || undefined) as TaskPriority | undefined,
        search: search || undefined,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: TaskStatus }) => 
      taskApi.updateStatus(id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Görev Yönetimi"
        description={`${data?.total ?? 0} görev kaydı`}
        actions={
          hasPermission('task:write') ? (
            <Link to="/gorevler/yeni" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(TASK_STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Select
          className="w-40"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm Öncelikler</option>
          {Object.entries(TASK_PRIORITY_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Input
          placeholder="Ara..."
          className="w-64"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Görev</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Bitiş Tarihi</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-40 text-right">Hızlı İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[250px]">{task.description ?? '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{task.employee.firstName} {task.employee.lastName}</div>
                  <div className="text-xs text-muted-foreground">{task.employee.unit?.name ?? task.employee.department?.name ?? '-'}</div>
                </TableCell>
                <TableCell>{formatDate(task.dueDate)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={TASK_PRIORITY_META[task.priority].variant} 
                  >
                    {TASK_PRIORITY_META[task.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={TASK_STATUS_META[task.status].variant} 
                  >
                    {TASK_STATUS_META[task.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {task.status !== 'DONE' && hasPermission('task:write') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Tamamlandı olarak işaretle"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: task.id, newStatus: 'DONE' })}
                      >
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    {task.status === 'DONE' && hasPermission('task:write') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Geri al (Devam Ediyor)"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: task.id, newStatus: 'IN_PROGRESS' })}
                      >
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && data.total > 0 && (
          <div className="p-4">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
