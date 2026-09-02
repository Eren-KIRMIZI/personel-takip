import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarPlus, Check, X, Ban } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { overtimeApi, formatDate, type OvertimeEntry, type OvertimeStatus } from '@/features/mesai/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;

export function MesaiListPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<OvertimeEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<OvertimeEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['overtimes', status, from, to, page],
    queryFn: () =>
      overtimeApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: (status || undefined) as OvertimeStatus | undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['overtimes'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => overtimeApi.approve(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => overtimeApi.reject(rejectTarget!.id, rejectReason),
    onSuccess: async () => {
      await invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => overtimeApi.cancel(cancelTarget!.id),
    onSuccess: async () => {
      await invalidate();
      setCancelTarget(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mesai Yönetimi"
        description={`${data?.total ?? 0} kayıt`}
        actions={
          hasPermission('overtime:create') ? (
            <Link to="/mesai/yeni" className={buttonVariants()}>
              <CalendarPlus /> Mesai Ekle
            </Link>
          ) : undefined
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm durumlar</option>
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="REJECTED">Reddedildi</option>
          <option value="CANCELLED">İptal</option>
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <span className="text-sm text-muted-foreground">–</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Saat</TableHead>
              <TableHead>Katsayı</TableHead>
              <TableHead>Hesaplanan Saat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-40 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="leading-tight">
                    <div className="font-medium">
                      {entry.employee.firstName} {entry.employee.lastName}
                    </div>
                    {entry.employee.employeeNo && (
                      <div className="text-xs text-muted-foreground">{entry.employee.employeeNo}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell>{entry.hours} saat</TableCell>
                <TableCell>{entry.rate}×</TableCell>
                <TableCell>{(entry.hours * entry.rate).toLocaleString('tr-TR')} saat</TableCell>
                <TableCell><StatusBadge status={entry.status} /></TableCell>
                <TableCell>
                  {entry.status === 'PENDING' && (
                    <div className="flex justify-end gap-1">
                      {hasPermission('overtime:approve') && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Onayla"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(entry.id)}
                        >
                          <Check /> Onayla
                        </Button>
                      )}
                      {hasPermission('overtime:reject') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reddet"
                          onClick={() => {
                            setRejectTarget(entry);
                            setRejectReason('');
                          }}
                        >
                          <X /> Reddet
                        </Button>
                      )}
                      {hasPermission('overtime:create') && (
                        <Button variant="ghost" size="icon" title="İptal" onClick={() => setCancelTarget(entry)}>
                          <Ban />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt yok</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && (
          <div className="p-4">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Dialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Mesaiyi Reddet"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName} — ${formatDate(rejectTarget.date)}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? 'İşleniyor…' : 'Reddet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Red nedeni *</label>
          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
      </Dialog>

      <Dialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Kaydı iptal et"
        description={cancelTarget ? `${cancelTarget.employee.firstName} ${cancelTarget.employee.lastName} — ${cancelTarget.hours} saat` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? 'İşleniyor…' : 'İptal Et'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Mesai kaydı iptal edilecek. Geri alınamaz.</p>
      </Dialog>
    </div>
  );
}