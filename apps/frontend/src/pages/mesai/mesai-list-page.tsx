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
  CheckCircle2,
  Timer,
  CircleDashed,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import {
  overtimeApi,
  formatDate,
  formatDateTime,
  type OvertimeEntry,
  type OvertimeStatus,
} from '@/features/mesai/api';
import { formatError } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<OvertimeStatus, {
  label: string;
  badgeVariant: 'secondary' | 'success' | 'destructive' | 'outline';
  icon: typeof CheckCircle2;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  microcopy: string;
}> = {
  PENDING: {
    label: 'Beklemede',
    badgeVariant: 'secondary',
    icon: CircleDashed,
    iconColor: 'text-amber-500',
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-50/30',
    microcopy: 'Yönetici onayı bekleniyor',
  },
  APPROVED: {
    label: 'Onaylandı',
    badgeVariant: 'success',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-50/30',
    microcopy: 'Onaylandı',
  },
  REJECTED: {
    label: 'Reddedildi',
    badgeVariant: 'destructive',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-400',
    bgColor: 'bg-red-50/30',
    microcopy: 'Reddedildi',
  },
  CANCELLED: {
    label: 'İptal',
    badgeVariant: 'outline',
    icon: Ban,
    iconColor: 'text-gray-400',
    borderColor: 'border-l-gray-300',
    bgColor: 'bg-gray-50/30',
    microcopy: 'İptal edildi',
  },
};

function OvertimeCard({
  entry,
  onApprove,
  onReject,
  onCancel,
  isApproving,
  isRejecting,
  isCancelling,
  showActions,
}: {
  entry: OvertimeEntry;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isCancelling: boolean;
  showActions: boolean;
}) {
  const config = STATUS_CONFIG[entry.status];
  const StatusIcon = config.icon;
  const totalHours = entry.hours * entry.rate;

  const approverName = entry.approvedBy
    ? entry.approvedBy.employee
      ? `${entry.approvedBy.employee.firstName} ${entry.approvedBy.employee.lastName}`
      : entry.approvedBy.username
    : null;

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-[3px] transition-all duration-150',
        config.borderColor,
        config.bgColor,
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header: Person + Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar
              firstName={entry.employee.firstName}
              lastName={entry.employee.lastName}
              className="size-10 text-sm font-semibold shadow-sm"
            />
            <div>
              <div className="font-semibold text-foreground text-sm">
                {entry.employee.firstName} {entry.employee.lastName}
              </div>
              {entry.employee.employeeNo && (
                <div className="text-[11px] text-muted-foreground font-mono">
                  #{entry.employee.employeeNo}
                </div>
              )}
            </div>
          </div>
          <Badge variant={config.badgeVariant} className="shrink-0 gap-1.5">
            <StatusIcon className={cn('size-3', config.iconColor)} />
            {config.label}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Tarih</span>
            <p className="text-foreground font-medium mt-0.5">{formatDate(entry.date)}</p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Saat</span>
            <p className="text-foreground font-medium mt-0.5">{entry.hours} saat</p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Katsayı</span>
            <p className="text-foreground font-medium mt-0.5">{entry.rate}×</p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Toplam Süre</span>
            <p className="text-foreground font-semibold mt-0.5 text-primary">
              {totalHours.toLocaleString('tr-TR')} saat
            </p>
          </div>
        </div>

        {/* Description */}
        {entry.workArea && (
          <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 mb-3 text-sm">
            <span className="font-medium">Çalışılacak alan:</span> {entry.workArea}
          </div>
        )}
        {entry.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {entry.description}
          </p>
        )}

        {/* Rejection Reason */}
        {entry.status === 'REJECTED' && entry.rejectionReason && (
          <div className="rounded-lg bg-red-50/60 border border-red-100 px-3 py-2 mb-3 text-sm text-red-700">
            <span className="font-medium">Red nedeni:</span> {entry.rejectionReason}
          </div>
        )}

        {/* Footer: Microcopy + Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {entry.status === 'APPROVED' && approverName && entry.approvedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {approverName} tarafından onaylandı · {formatDateTime(entry.approvedAt)}
              </span>
            )}
            {entry.status === 'PENDING' && (
              <span className="flex items-center gap-1">
                <Timer className="size-3.5 text-amber-500" />
                {config.microcopy}
              </span>
            )}
            {entry.status === 'REJECTED' && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-red-500" />
                {config.microcopy}
              </span>
            )}
            {entry.status === 'CANCELLED' && (
              <span className="flex items-center gap-1">
                <Ban className="size-3.5 text-gray-400" />
                {config.microcopy}
              </span>
            )}
          </div>

          {/* Actions */}
          {entry.status === 'PENDING' && showActions && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="destructive"
                size="sm"
                disabled={isRejecting}
                onClick={onReject}
                className="h-8 text-xs"
              >
                <X className="size-3.5 mr-1" />
                Reddet
              </Button>
              {isCancelling ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-8 text-xs"
                >
                  İptal ediliyor…
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 text-xs"
                >
                  <Ban className="size-3.5 mr-1" />
                  İptal
                </Button>
              )}
              <Button
                variant="success"
                size="sm"
                disabled={isApproving}
                onClick={onApprove}
                className="h-8 text-xs"
              >
                <Check className="size-3.5 mr-1" />
                {isApproving ? 'Onaylanıyor…' : 'Onayla'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

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

  // ── Optimistic Approve ────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id: string) => overtimeApi.approve(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['overtimes'] });
      const previous = queryClient.getQueriesData({ queryKey: ['overtimes'] });

      queryClient.setQueriesData({ queryKey: ['overtimes'] }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item: OvertimeEntry) =>
            item.id === id ? { ...item, status: 'APPROVED' as const } : item
          ),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Mesai talebi onaylandı', message: 'Onaylama başarıyla tamamlandı.' });
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast({ type: 'error', title: 'Onaylama başarısız', message: formatError(error) });
      invalidate();
    },
    onSettled: () => invalidate(),
  });

  // ── Reject ────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: () => overtimeApi.reject(rejectTarget!.id, rejectReason),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['overtimes'] });
      const previous = queryClient.getQueriesData({ queryKey: ['overtimes'] });

      queryClient.setQueriesData({ queryKey: ['overtimes'] }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item: OvertimeEntry) =>
            item.id === rejectTarget!.id
              ? { ...item, status: 'REJECTED' as const, rejectionReason: rejectReason }
              : item
          ),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      setRejectTarget(null);
      setRejectReason('');
      toast({ type: 'info', title: 'Mesai talebi reddedildi', message: 'Red işlemi tamamlandı.' });
    },
    onError: (error, _var, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast({ type: 'error', title: 'Reddetme başarısız', message: formatError(error) });
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onSettled: () => invalidate(),
  });

  // ── Optimistic Cancel ─────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: () => overtimeApi.cancel(cancelTarget!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['overtimes'] });
      const previous = queryClient.getQueriesData({ queryKey: ['overtimes'] });

      queryClient.setQueriesData({ queryKey: ['overtimes'] }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item: OvertimeEntry) =>
            item.id === cancelTarget!.id ? { ...item, status: 'CANCELLED' as const } : item
          ),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      setCancelTarget(null);
      toast({ type: 'info', title: 'Mesai kaydı iptal edildi' });
    },
    onError: (error, _var, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast({ type: 'error', title: 'İptal başarısız', message: formatError(error) });
      setCancelTarget(null);
      invalidate();
    },
    onSettled: () => invalidate(),
  });

  const showActions = hasPermission('overtime:approve') || hasPermission('overtime:create');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mesai Yönetimi"
        description={data ? `Toplam ${data.total} mesai kaydı` : 'Kayıtlar yükleniyor…'}
        actions={
          hasPermission('overtime:create') ? (
            <Link to="/mesai/yeni" className={buttonVariants()}>
              <CalendarPlus className="mr-2 size-4" /> Mesai Ekle
            </Link>
          ) : undefined
        }
      />

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

      {/* ── Cards ───────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 border-l-[3px] border-l-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}

        {!isLoading && data?.items.map((entry) => (
          <OvertimeCard
            key={entry.id}
            entry={entry}
            onApprove={() => approveMutation.mutate(entry.id)}
            onReject={() => { setRejectTarget(entry); setRejectReason(''); }}
            onCancel={() => setCancelTarget(entry)}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
            isCancelling={cancelMutation.isPending}
            showActions={showActions}
          />
        ))}

        {!isLoading && data?.items.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <Clock className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Mesai kaydı bulunamadı</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Farklı bir tarih veya durum filtresi seçin.
            </p>
          </Card>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}

      {/* ── Dialogs ─────────────────────────────────── */}
      <Dialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Mesaiyi Reddet"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName} — ${formatDate(rejectTarget.date)}` : undefined}
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
        title="Kaydı İptal Et"
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
