import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Check, CircleDollarSign, Play, Wallet, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { employeesApi } from '@/features/personel/api';
import { formatMoney, monthLabel, payrollApi } from '@/features/maas/api';
import type { PayrollItem } from '@/features/maas/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 20;
const NOW = new Date();

export function MaasPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PayrollItem | null>(null);
  const [salaryOpen, setSalaryOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', year, month, page],
    queryFn: () => payrollApi.list({ page, pageSize: PAGE_SIZE, periodYear: year, periodMonth: month }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['payroll'] });
  };

  const generateMutation = useMutation({
    mutationFn: () => payrollApi.generate(year, month),
    onSuccess: async () => {
      await invalidate();
      setErrorMessage(null);
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => payrollApi.approve(id),
    onSuccess: async () => invalidate(),
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => payrollApi.markPaid(id),
    onSuccess: async () => invalidate(),
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const totals = useMemo(() => {
    if (!data?.items.length) return null;
    return data.items.reduce(
      (acc, it) => {
        acc.gross += it.grossAmount;
        acc.net += it.netAmount;
        if (it.status !== 'CANCELLED') acc.count += 1;
        return acc;
      },
      { gross: 0, net: 0, count: 0 },
    );
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maaş / Borduro"
        description="Dönemsel bordro"
        actions={
          hasPermission('payroll:write') ? (
            <Button variant="outline" onClick={() => setSalaryOpen(true)}>
              <BadgeDollarSign /> Personel Maaşı
            </Button>
          ) : undefined
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Yıl</label>
          <Select className="w-28" value={String(year)} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
            {Array.from({ length: 4 }, (_, i) => NOW.getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ay</label>
          <Select className="w-40" value={String(month)} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </Select>
        </div>
        {hasPermission('payroll:write') && (
          <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
            <Play /> {generateMutation.isPending ? 'Üretiliyor…' : 'Bordro Üret'}
          </Button>
        )}
      </div>

      {totals && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">{totals.count} satır</span>
          <span>Brüt: <b>{formatMoney(totals.gross)}</b></span>
          <span>Net: <b>{formatMoney(totals.net)}</b></span>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead className="text-right">Brüt Maaş</TableHead>
              <TableHead className="text-right">Mesai</TableHead>
              <TableHead className="text-right">İzin Kesintisi</TableHead>
              <TableHead className="text-right">Prim/İndirim</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-44 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))}
            {data?.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <div className="leading-tight">
                    <div className="font-medium">{it.employee.firstName} {it.employee.lastName}</div>
                    {it.employee.employeeNo && <div className="text-xs text-muted-foreground">{it.employee.employeeNo}</div>}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatMoney(it.baseSalary)}</TableCell>
                <TableCell className="text-right">+{formatMoney(it.overtimeAmount)}</TableCell>
                <TableCell className="text-right">-{formatMoney(it.leaveDeduction)}</TableCell>
                <TableCell className="text-right">
                  {(it.bonus ?? 0) - (it.deduction ?? 0) !== 0 ? formatMoney((it.bonus ?? 0) - (it.deduction ?? 0)) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">{formatMoney(it.netAmount)}</TableCell>
                <TableCell><StatusBadge status={it.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {it.status === 'DRAFT' && hasPermission('payroll:write') && (
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(it)} title="Düzenle">
                        <Pencil /> Düzenle
                      </Button>
                    )}
                    {it.status === 'DRAFT' && hasPermission('payroll:approve') && (
                      <Button variant="outline" size="sm" onClick={() => approveMutation.mutate(it.id)} title="Onayla">
                        <Check /> Onayla
                      </Button>
                    )}
                    {it.status === 'APPROVED' && hasPermission('payroll:approve') && (
                      <Button variant="outline" size="sm" onClick={() => paidMutation.mutate(it.id)} title="Ödendi">
                        <Wallet /> Ödendi
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Bu dönem için bordro yok. "Bordro Üret" ile hesaplayın.
                </TableCell>
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

      <EditSalaryDialog
        item={editTarget}
        onClose={() => setEditTarget(null)}
        onError={setErrorMessage}
        onSaved={() => { invalidate(); setEditTarget(null); }}
      />

      <SetSalaryDialog
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        onError={setErrorMessage}
        onSaved={() => invalidate()}
      />
    </div>
  );
}

function SetSalaryDialog({
  open,
  onClose,
  onError,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [note, setNote] = useState('');
  const { data: employees } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeesApi.list({ pageSize: 500 }) });
  const { data: current } = useQuery({
    queryKey: ['salary', employeeId],
    queryFn: () => payrollApi.getEmployeeSalary(employeeId),
    enabled: !!employeeId,
  });

  const mutation = useMutation({
    mutationFn: () => payrollApi.setSalary(employeeId, baseSalary, note.trim() || undefined),
    onSuccess: () => {
      onSaved();
      onClose();
      setEmployeeId('');
      setBaseSalary('');
      setNote('');
    },
    onError: (err) => onError(formatError(err)),
  });

  const submit = () => {
    if (!employeeId || !baseSalary) return;
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Personel Maaşı Belirle"
      description="Brüt aylık maaş kaydeder (bordrolara taşınır)"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!employeeId || !baseSalary || mutation.isPending} onClick={submit}>
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
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
                {emp.firstName} {emp.lastName}
                {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
              </option>
            ))}
          </Select>
        </div>
        {current && current.baseSalary != null && (
          <p className="text-xs text-muted-foreground">
            Mevcut: {formatMoney(current.baseSalary)}
            {current.lastPeriod ? ` (${monthLabel(current.lastPeriod.month)} ${current.lastPeriod.year})` : ''}
          </p>
        )}
        <div className="space-y-2">
          <Label>Brüt Maaş (TL) *</Label>
          <Input type="number" step="0.01" min="0" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="35000.00" />
        </div>
        <div className="space-y-2">
          <Label>Not</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. zamm" />
        </div>
      </div>
    </Dialog>
  );
}

function EditSalaryDialog({
  item,
  onClose,
  onError,
  onSaved,
}: {
  item: PayrollItem | null;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: () => void;
}) {
  const [bonus, setBonus] = useState('');
  const [deduction, setDeduction] = useState('');
  const [note, setNote] = useState('');

  // Reset when a new item is opened
  const key = item?.id;
  const mutation = useMutation({
    mutationFn: () =>
      payrollApi.update(item!.id, {
        bonus: bonus !== '' ? bonus : undefined,
        deduction: deduction !== '' ? deduction : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: onSaved,
    onError: (err) => onError(formatError(err)),
  });

  const calcNet = item ? item.baseSalary + item.overtimeAmount - item.leaveDeduction + (Number(bonus) || 0) - (Number(deduction) || 0) : 0;

  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title="Bordroyu Düzenle"
      description={item ? `${item.employee.firstName} ${item.employee.lastName} · ${monthLabel(item.periodMonth)} ${item.periodYear}` : undefined}
      key={key}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {item && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
            <CircleDollarSign className="size-4 text-muted-foreground" />
            <span>
              Hesaplanan net: <b>{formatMoney(item.baseSalary + item.overtimeAmount - item.leaveDeduction)}</b> → Yeni net:{' '}
              <b>{formatMoney(calcNet)}</b>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prim (bonus)</Label>
            <Input type="number" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Kesinti (indirim)</Label>
            <Input type="number" step="0.01" value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Not</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. performans primi" />
        </div>
      </div>
    </Dialog>
  );
}