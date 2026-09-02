import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { leaveApi } from '@/features/izin/api';
import { overtimeApi, formatDate as otDate } from '@/features/mesai/api';
import { attendanceApi, formatDateTime, PUNCH_TYPE_LABEL, PUNCH_SOURCE_LABEL } from '@/features/giris-cikis/api';
import { payrollApi, formatMoney, monthLabel } from '@/features/maas/api';
import { SHIFT_DAY_LABEL, SHIFT_DAY_ORDER, shiftApi } from '@/features/vardiya/api';
import { formatError } from '@/lib/utils';

function SubCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}><TableCell colSpan={cols}><Skeleton className="h-7 w-full" /></TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatDateShorthand(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '-';
}

export function IzinlerTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-leaves', employeeId],
    queryFn: () => leaveApi.list({ employeeId, pageSize: 15 }),
  });
  return (
    <SubCard title="İzinler">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tip</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead className="text-right">Gün</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.leaveType?.name ?? '-'}</TableCell>
                <TableCell>{formatDateShorthand(l.startDate)}</TableCell>
                <TableCell>{formatDateShorthand(l.endDate)}</TableCell>
                <TableCell className="text-right">{l.days}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="İzin kaydı yok" />
      )}
    </SubCard>
  );
}

export function MesaiTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-ot', employeeId],
    queryFn: () => overtimeApi.list({ employeeId, pageSize: 15 }),
  });
  return (
    <SubCard title="Mesai Kayıtları">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Saat</TableHead>
              <TableHead className="text-right">Katsayı</TableHead>
              <TableHead className="text-right">Hesap</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{otDate(o.date)}</TableCell>
                <TableCell className="text-right">{o.hours}</TableCell>
                <TableCell className="text-right">{o.rate}×</TableCell>
                <TableCell className="text-right">{(o.hours * o.rate).toFixed(1)}s</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Mesai kaydı yok" />
      )}
    </SubCard>
  );
}

export function GirisCikisTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-attendance', employeeId],
    queryFn: () => attendanceApi.list({ employeeId, pageSize: 15 }),
  });
  return (
    <SubCard title="Giriş-Çıkış Hareketleri">
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zaman</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Konum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDateTime(a.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant={a.type === 'IN' ? 'success' : 'secondary'}>{PUNCH_TYPE_LABEL[a.type]}</Badge>
                </TableCell>
                <TableCell>{PUNCH_SOURCE_LABEL[a.source]}</TableCell>
                <TableCell className="text-muted-foreground">{a.location?.name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Hareket kaydı yok" />
      )}
    </SubCard>
  );
}

export function CalismaPlaniTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-shifts', employeeId],
    queryFn: () => shiftApi.assignments({ employeeId }),
  });
  const hasWrite = useAuthStore((s) => s.hasPermission('shift:write'));

  const byDay = SHIFT_DAY_ORDER.map((day) => ({
    day,
    rows: (data ?? []).filter((a) => a.day === day),
  }));

  return (
    <SubCard title="Çalışma Planı / Haftalık Vardiya">
      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : data && data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gün</TableHead>
              <TableHead>Vardiya</TableHead>
              <TableHead>Saat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byDay.map(({ day, rows }) => (
              <TableRow key={day}>
                <TableCell className="font-medium">{SHIFT_DAY_LABEL[day]}</TableCell>
                <TableCell>
                  {rows.length ? rows.map((r) => r.shift.name).join(', ') : <span className="text-muted-foreground">İzin / Boş</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rows.length ? rows.map((r) => `${r.shift.startTime}–${r.shift.endTime}`).join(', ') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : hasWrite ? (
        <EmptyState label="Vardiya ataması yok. Vardiyalar sayfasından atayın." />
      ) : (
        <EmptyState label="Vardiya ataması yok." />
      )}
    </SubCard>
  );
}

export function MaasBordroTab({ employeeId }: { employeeId: string }) {
  const hasWrite = useAuthStore((s) => s.hasPermission('payroll:write'));
  const queryClient = useQueryClient();

  const { data: salary } = useQuery({
    queryKey: ['mid-salary', employeeId],
    queryFn: () => payrollApi.getEmployeeSalary(employeeId),
  });
  const { data: items, isLoading } = useQuery({
    queryKey: ['mid-payroll', employeeId],
    queryFn: () => payrollApi.list({ employeeId, pageSize: 12 }),
  });

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [baseSalary, setBaseSalary] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setSalary = useMutation({
    mutationFn: () => payrollApi.setSalary(employeeId, baseSalary, undefined),
    onSuccess: () => {
      setSalaryOpen(false);
      setBaseSalary('');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['mid-salary', employeeId] });
      void queryClient.invalidateQueries({ queryKey: ['mid-payroll', employeeId] });
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const submitSalary = () => {
    if (!baseSalary) return;
    setSalary.mutate();
  };

  return (
    <div className="space-y-4">
      <SubCard
        title="Cari Maaş"
        action={
          hasWrite ? (
            <Button variant="outline" size="sm" onClick={() => setSalaryOpen(true)}>
              Maaş Belirle
            </Button>
          ) : undefined
        }
      >
        {errorMessage && <p className="mb-2 text-sm text-destructive">{errorMessage}</p>}
        {salary?.baseSalary != null ? (
          <div className="space-y-0.5">
            <div className="text-2xl font-semibold">{formatMoney(salary.baseSalary)} brüt</div>
            {salary.lastPeriod && (
              <div className="text-xs text-muted-foreground">
                Son dönem {monthLabel(salary.lastPeriod.month)} {salary.lastPeriod.year}
              </div>
            )}
          </div>
        ) : (
          <EmptyState label={hasWrite ? 'Maaş tanımlanmamış. Maaş Belirle ile başlayın.' : 'Maaş tanımlanmamış.'} />
        )}
      </SubCard>

      <SubCard title="Dönemsel Bordrolar">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : items && items.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dönem</TableHead>
                <TableHead className="text-right">Brüt</TableHead>
                <TableHead className="text-right">Mesai</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{monthLabel(p.periodMonth)} {p.periodYear}</TableCell>
                  <TableCell className="text-right">{formatMoney(p.baseSalary)}</TableCell>
                  <TableCell className="text-right">+{formatMoney(p.overtimeAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.netAmount)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState label="Bordro kaydı yok. Maaş sayfasından dönemsel üretim yapın." />
        )}
      </SubCard>

      <Dialog
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        title="Maaş Belirle"
        description="Brüt aylık maaş"
        footer={
          <>
            <Button variant="outline" onClick={() => setSalaryOpen(false)}>Vazgeç</Button>
            <Button disabled={!baseSalary || setSalary.isPending} onClick={submitSalary}>
              {setSalary.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label>Brüt Maaş (TL)</Label>
          <Input type="number" min="0" step="0.01" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="35000.00" />
        </div>
      </Dialog>
    </div>
  );
}