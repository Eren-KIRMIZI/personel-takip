import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  Check,
  X,
  Ban,
  Clock,
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
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Mesai Yönetimi"
        description={data ? `Toplam ${data.total} mesai kaydı bulunuyor` : 'Kayıtlar yükleniyor…'}
        actions={
          hasPermission('overtime:create') ? (
            <Link to="/mesai/yeni" className={buttonVariants()}>
              <CalendarPlus className="mr-2 size-4" /> Mesai Ekle
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

          <div className="flex items-center gap-2 w-full sm:w-auto bg-card rounded-lg border border-border px-2">
             <Input 
                type="date" 
                className="w-[130px] border-none shadow-none focus-visible:ring-0 px-1 text-sm bg-transparent" 
                value={from} 
                onChange={(e) => { setFrom(e.target.value); setPage(1); }} 
              />
              <span className="text-muted-foreground/50">–</span>
              <Input 
                type="date" 
                className="w-[130px] border-none shadow-none focus-visible:ring-0 px-1 text-sm bg-transparent" 
                value={to} 
                onChange={(e) => { setTo(e.target.value); setPage(1); }} 
              />
          </div>
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────── */}
      <Card className="overflow-hidden shadow-[var(--shadow-xs)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Personel</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Saat</TableHead>
              <TableHead>Katsayı</TableHead>
              <TableHead>Toplam</TableHead>
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

            {data?.items.map((entry) => (
              <TableRow key={entry.id} className="group hover:bg-muted/30 transition-colors duration-150">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={entry.employee.firstName}
                      lastName={entry.employee.lastName}
                      className="size-8 text-xs font-medium shadow-sm"
                    />
                    <div className="leading-tight">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </div>
                      {entry.employee.employeeNo && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          #{entry.employee.employeeNo}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{formatDate(entry.date)}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{entry.hours} sa</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{entry.rate}×</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm font-semibold text-primary">{(entry.hours * entry.rate).toLocaleString('tr-TR')} sa</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={entry.status} />
                </TableCell>
                <TableCell className="pr-6">
                  {entry.status === 'PENDING' && (
                    <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                      {hasPermission('overtime:approve') && (
                        <Button
                          variant="success"
                          size="icon"
                          title="Onayla"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(entry.id)}
                          className="size-8 rounded-full shadow-sm"
                        >
                          <Check className="size-4" />
                        </Button>
                      )}
                      {hasPermission('overtime:reject') && (
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Reddet"
                          onClick={() => {
                            setRejectTarget(entry);
                            setRejectReason('');
                          }}
                          className="size-8 rounded-full shadow-sm"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                      {hasPermission('overtime:create') && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="İptal Et"
                          onClick={() => setCancelTarget(entry)}
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
                      <Clock className="size-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Mesai kaydı bulunamadı</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Farklı bir tarih veya durum filtresi seçin.
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
        title="Mesaiyi Reddet"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName} personeline ait ${formatDate(rejectTarget.date)} tarihli mesai reddedilecek.` : undefined}
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
        title="Kaydı iptal et"
        description={cancelTarget ? `${cancelTarget.employee.firstName} ${cancelTarget.employee.lastName} — ${cancelTarget.hours} saat` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? 'İptal Ediliyor…' : 'İptal Et'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Mesai kaydı kalıcı olarak iptal edilecek. Bu işlem geri alınamaz.</p>
      </Dialog>
    </div>
  );
}