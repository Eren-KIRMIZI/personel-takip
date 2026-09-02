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
import { leaveApi, formatDate, type LeaveRequest, type LeaveStatus } from '@/features/izin/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;

export function IzinListPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<string>('');
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', status, leaveTypeId, page],
    queryFn: () =>
      leaveApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: (status || undefined) as LeaveStatus | undefined,
        leaveTypeId: leaveTypeId || undefined,
      }),
  });
  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => leaveApi.reject(rejectTarget!.id, rejectReason),
    onSuccess: async () => {
      await invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => leaveApi.cancel(cancelTarget!.id),
    onSuccess: async () => {
      await invalidate();
      setCancelTarget(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="İzin Yönetimi"
        description={`${data?.total ?? 0} talep`}
        actions={
          hasPermission('leave:create') ? (
            <Link to="/izin/yeni" className={buttonVariants()}>
              <CalendarPlus /> Yeni İzin Talebi
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
        <Select
          className="w-56"
          value={leaveTypeId}
          onChange={(e) => {
            setLeaveTypeId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm izin tipleri</option>
          {types?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>İzin Tipi</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Gün</TableHead>
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
            {data?.items.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="leading-tight">
                    <div className="font-medium">
                      {request.employee.firstName} {request.employee.lastName}
                    </div>
                    {request.employee.employeeNo && (
                      <div className="text-xs text-muted-foreground">{request.employee.employeeNo}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    {request.leaveType.color && (
                      <span className="size-2 rounded-full" style={{ backgroundColor: request.leaveType.color }} />
                    )}
                    {request.leaveType.name}
                  </span>
                </TableCell>
                <TableCell>{formatDate(request.startDate)}</TableCell>
                <TableCell>{formatDate(request.endDate)}</TableCell>
                <TableCell>{request.days}</TableCell>
                <TableCell><StatusBadge status={request.status} /></TableCell>
                <TableCell>
                  {request.status === 'PENDING' && (
                    <div className="flex justify-end gap-1">
                      {hasPermission('leave:approve') && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Onayla"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(request.id)}
                        >
                          <Check /> Onayla
                        </Button>
                      )}
                      {hasPermission('leave:reject') && (
                        <Button variant="ghost" size="sm" title="Reddet" onClick={() => { setRejectTarget(request); setRejectReason(''); }}>
                          <X /> Reddet
                        </Button>
                      )}
                      {hasPermission('leave:create') && (
                        <Button variant="ghost" size="icon" title="İptal" onClick={() => setCancelTarget(request)}>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">Talep yok</TableCell>
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
        title="İzini Reddet"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName}` : undefined}
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
        title="Talebi iptal et"
        description={cancelTarget ? `${cancelTarget.employee.firstName} ${cancelTarget.employee.lastName} — ${cancelTarget.leaveType.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? 'İşleniyor…' : 'İptal Et'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Talep iptal edilecek. Geri alınamaz.</p>
      </Dialog>
    </div>
  );
}