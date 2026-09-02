import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  Check,
  X,
  Ban,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
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
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="İzin Yönetimi"
        description={data ? `${data.total} izin talebi bulunuyor` : 'Talepler yükleniyor…'}
        actions={
          hasPermission('leave:create') ? (
            <Link to="/izin/yeni" className={buttonVariants()}>
              <CalendarPlus className="mr-2 size-4" /> Yeni İzin Talebi
            </Link>
          ) : undefined
        }
      />

      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100 animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────── */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" /> Filtreler
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          
          <Select
            className="w-full sm:w-48 bg-transparent"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm durumlar</option>
            <option value="PENDING">Bekleyenler</option>
            <option value="APPROVED">Onaylananlar</option>
            <option value="REJECTED">Reddedilenler</option>
            <option value="CANCELLED">İptal Edilenler</option>
          </Select>
          
          <Select
            className="w-full sm:w-56 bg-transparent"
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
      </Card>

      {/* ── Table ───────────────────────────────────── */}
      <Card className="overflow-hidden shadow-[var(--shadow-xs)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Personel</TableHead>
              <TableHead>İzin Tipi</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Gün</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-40 text-right pr-6">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="px-6 py-4">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
              
            {data?.items.map((request) => (
              <TableRow key={request.id} className="group hover:bg-muted/30 transition-colors duration-150">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={request.employee.firstName}
                      lastName={request.employee.lastName}
                      className="size-8 text-xs font-medium shadow-sm"
                    />
                    <div className="leading-tight">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {request.employee.firstName} {request.employee.lastName}
                      </div>
                      {request.employee.employeeNo && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          #{request.employee.employeeNo}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                    {request.leaveType.color ? (
                      <span className="size-2 rounded-full" style={{ backgroundColor: request.leaveType.color }} />
                    ) : (
                      <span className="size-2 rounded-full bg-border" />
                    )}
                    {request.leaveType.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{formatDate(request.startDate)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{formatDate(request.endDate)}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{request.days}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell className="pr-6">
                  {request.status === 'PENDING' && (
                    <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                      {hasPermission('leave:approve') && (
                        <Button
                          variant="success"
                          size="icon"
                          title="Onayla"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(request.id)}
                          className="size-8 rounded-full shadow-sm"
                        >
                          <Check className="size-4" />
                        </Button>
                      )}
                      {hasPermission('leave:reject') && (
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Reddet"
                          onClick={() => { setRejectTarget(request); setRejectReason(''); }}
                          className="size-8 rounded-full shadow-sm"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                      {hasPermission('leave:create') && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="İptal Et"
                          onClick={() => setCancelTarget(request)}
                          className="size-8 rounded-full shadow-sm"
                        >
                          <Ban className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
                      <CalendarDays className="size-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Talep bulunamadı</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Arama kriterlerini değiştirmeyi deneyin
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && data.total > PAGE_SIZE && (
          <div className="border-t border-border px-4 py-3">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* ── Dialogs ─────────────────────────────────── */}
      <Dialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="İzini Reddet"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName} personeline ait izin talebi reddedilecek.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? 'Reddediliyor…' : 'Reddet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <Label>Red nedeni *</Label>
          <Input 
            placeholder="Lütfen reddetme sebebini girin" 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
          />
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
              {cancelMutation.isPending ? 'İptal Ediliyor…' : 'İptal Et'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Talep kalıcı olarak iptal edilecek. Bu işlem geri alınamaz.</p>
      </Dialog>
    </div>
  );
}