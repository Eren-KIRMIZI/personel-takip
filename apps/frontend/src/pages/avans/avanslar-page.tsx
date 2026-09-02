import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, Ban, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { advanceApi, ADVANCE_STATUS_META, formatMoney, monthLabel, type AdvanceItem, type AdvanceStatus } from '@/features/avans/api';
import { employeesApi } from '@/features/personel/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;
const NOW = new Date();
const PERIOD_OPTIONS = Array.from({ length: 4 }, (_, i) => NOW.getFullYear() - i);

export function AvanslarPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [periodYear, setPeriodYear] = useState(NOW.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(NOW.getMonth() + 1);
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdvanceItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['advances', periodYear, periodMonth, status, page],
    queryFn: () =>
      advanceApi.list({
        page,
        pageSize: PAGE_SIZE,
        periodYear,
        periodMonth,
        status: (status || undefined) as AdvanceStatus | undefined,
      }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['advances'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => advanceApi.approve(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => advanceApi.reject(rejectTarget!.id, rejectReason),
    onSuccess: async () => {
      await invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (error) => {
      setErrorMessage(formatError(error));
      setRejectTarget(null);
    },
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => advanceApi.markPaid(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => advanceApi.cancel(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Avanslar"
        description="Personel avans talepleri ve ödemeleri"
        actions={
          hasPermission('advance:write') ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Yeni Avans
            </Button>
          ) : undefined
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Yıl</label>
          <Select className="w-28" value={String(periodYear)} onChange={(e) => { setPeriodYear(Number(e.target.value)); setPage(1); }}>
            {PERIOD_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ay</label>
          <Select className="w-40" value={String(periodMonth)} onChange={(e) => { setPeriodMonth(Number(e.target.value)); setPage(1); }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Durum</label>
          <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tümü</option>
            {(Object.entries(ADVANCE_STATUS_META) as Array<[AdvanceStatus, { label: string }]>).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead className="text-center">Taksit</TableHead>
              <TableHead>Dönem</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : data && data.items.length ? (
              data.items.map((a) => {
                const meta = ADVANCE_STATUS_META[a.status];
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.employee.firstName} {a.employee.lastName}</div>
                      {a.employee.employeeNo && <div className="text-xs text-muted-foreground">{a.employee.employeeNo}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(a.amount)}</TableCell>
                    <TableCell className="text-center">{a.installmentCount}×</TableCell>
                    <TableCell>{monthLabel(a.periodMonth)} {a.periodYear}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'PENDING' && hasPermission('advance:approve') && (
                          <>
                            <Button size="sm" variant="default" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(a.id)} title="Onayla">
                              <Check className="size-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectTarget(a)} title="Reddet">
                              <X className="size-3" />
                            </Button>
                          </>
                        )}
                        {a.status === 'APPROVED' && hasPermission('advance:approve') && (
                          <Button size="sm" variant="default" disabled={paidMutation.isPending} onClick={() => paidMutation.mutate(a.id)} title="Ödendi">
                            <Banknote className="size-3" />
                          </Button>
                        )}
                        {(a.status === 'PENDING' || a.status === 'APPROVED') && hasPermission('advance:write') && (
                          <Button size="sm" variant="outline" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(a.id)} title="İptal">
                            <Ban className="size-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Bu dönem için avans kaydı yok.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && <Pagination total={data.total} page={data.page} pageSize={PAGE_SIZE} onPageChange={setPage} />}
      </Card>

      <CreateAdvanceDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={invalidate} onError={setErrorMessage} />

      <Dialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Avans Reddi"
        description={`${rejectTarget?.employee.firstName} ${rejectTarget?.employee.lastName} — ${rejectTarget ? formatMoney(rejectTarget.amount) : ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? 'Reddediliyor…' : 'Reddet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label>Red Gerekçesi *</Label>
          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="neden reddedildi…" />
        </div>
      </Dialog>
    </div>
  );
}

function CreateAdvanceDialog({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [periodYear, setPeriodYear] = useState(String(NOW.getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(String(NOW.getMonth() + 1));
  const [description, setDescription] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-adv'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const mutation = useMutation({
    mutationFn: () => advanceApi.create({
      employeeId,
      amount,
      installmentCount: Number(installmentCount) || 1,
      periodYear: Number(periodYear) || NOW.getFullYear(),
      periodMonth: Number(periodMonth) || NOW.getMonth() + 1,
      description: description.trim() || undefined,
    }),
    onSuccess: async () => {
      await onCreated();
      onClose();
      setEmployeeId('');
      setAmount('');
      setInstallmentCount('1');
      setDescription('');
    },
    onError: (error) => onError(formatError(error)),
  });

  const reset = () => {
    onClose();
    setEmployeeId('');
    setAmount('');
    setInstallmentCount('1');
    setDescription('');
  };

  return (
    <Dialog
      open={open}
      onClose={reset}
      title="Yeni Avans Talebi"
      description="Personel avans talebi oluşturur"
      footer={
        <>
          <Button variant="outline" onClick={reset}>Vazgeç</Button>
          <Button disabled={!employeeId || !amount || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Personel *</Label>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Seçin…</option>
            {employees?.items.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}{emp.employeeNo ? ` (${emp.employeeNo})` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tutar (TL) *</Label>
          <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000.00" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Taksit</Label>
            <Select value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}×</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dönem Yılı</Label>
            <Select value={periodYear} onChange={(e) => setPeriodYear(e.target.value)}>
              {PERIOD_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dönem Ayı</Label>
            <Select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Not</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="avans açıklaması…" />
        </div>
      </div>
    </Dialog>
  );
}