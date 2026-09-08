import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  reportsApi,
  downloadCsv,
  downloadExcel,
  durationLabel,
  FULL_NAME,
  type AbsenceRow,
  type EmployeeRef,
  type NewHireRow,
  type PresentNowRow,
  type PunchSourceKind,
  type TerminationRow,
  type WeekendRow,
} from '@/features/raporlar/api';
import { employeesApi, type Employee } from '@/features/personel/api';
import { ADVANCE_STATUS_META, advanceApi } from '@/features/avans/api';
import { BONUS_STATUS_META, bonusApi } from '@/features/prim/api';
import { PAYROLL_STATUS_META, formatMoney, monthLabel, payrollApi } from '@/features/maas/api';
import { SHIFT_DAY_LABEL, durationLabel as shiftDuration, shiftApi } from '@/features/vardiya/api';
import { formatError } from '@/lib/utils';

export type ReportSection = 'genel' | 'hesap';

export interface ReportDef {
  id: string;
  section: ReportSection;
  title: string;
  description: string;
  permission: string;
  kind: 'range' | 'month' | 'none';
  employee?: boolean;
  side?: 'IN' | 'OUT' | 'BOTH';
  wide?: boolean;
}

export interface ReportParams {
  from?: string;
  to?: string;
  month?: string;
  employeeId?: string;
}

const rangeQ = (p: ReportParams) => ({
  from: p.from || undefined,
  to: p.to || undefined,
  employeeId: p.employeeId || undefined,
});

const person = (e: EmployeeRef) => `${e.firstName} ${e.lastName}`;

const srcLabel = (s: PunchSourceKind | null | undefined) =>
  s === 'MANUAL' ? 'Manuel' : s === 'QR' ? 'QR' : s === 'PDKS' ? 'PDKS' : s === 'CARD' ? 'Kart' : '—';

const typeLabel = (t: 'IN' | 'OUT') => (t === 'IN' ? 'Giriş' : 'Çıkış');

interface Column<T> {
  header: React.ReactNode;
  className?: string;
  render: (row: T) => React.ReactNode;
}

function LoadingRows() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead className="text-right">Değer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-6 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyRows({ text = 'Bu aralıkta veri yok' }: { text?: string }) {
  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="text-center text-muted-foreground">{text}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function ReportTable<T>({ rows, columns, keyFn }: { rows: T[]; columns: Column<T>[]; keyFn: (row: T, i: number) => string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c, i) => (
            <TableHead key={i} className={cn('whitespace-nowrap', c.className)}>
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={keyFn(row, i)}>
            {columns.map((c, j) => (
              <TableCell key={j} className={cn('whitespace-nowrap', c.className)}>
                {c.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DataCard({
  title,
  description,
  loading,
  error,
  empty,
  children,
  onExport,
  exportLabel = 'Excel',
  exportDisabled,
}: {
  title: string;
  description: string;
  loading: boolean;
  error?: string | null;
  empty: boolean;
  children: React.ReactNode;
  onExport: () => void;
  exportLabel?: string;
  exportDisabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} disabled={exportDisabled}>
          <Download /> {exportLabel}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <LoadingRows />
        ) : empty ? (
          <EmptyRows />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// GENEL rapor görünümleri
// ─────────────────────────────────────────────────────────────

function PunchListView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-entries', params],
    queryFn: () => reportsApi.entries(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'giris-cikis-listesi.csv',
      ['Tarih', 'Saat', 'Sicil', 'Personel', 'Tür', 'Kaynak', 'Konum'],
      rows.map((r) => [r.date, r.time, r.employee.employeeNo ?? '', person(r.employee), typeLabel(r.type), srcLabel(r.source), r.location ?? '']),
    );
  return (
    <DataCard
      title="Giriş Çıkış Listesi"
      description={`${data?.meta.total ?? 0} kayıt`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${r.time}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Saat', render: (r) => r.time },
          { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employee.employeeNo ?? '—' },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Tür', render: (r) => <Badge variant={r.type === 'IN' ? 'success' : 'secondary'}>{typeLabel(r.type)}</Badge> },
          { header: 'Kaynak', render: (r) => srcLabel(r.source) },
          { header: 'Konum', className: 'text-muted-foreground', render: (r) => r.location ?? '—' },
        ]}
      />
    </DataCard>
  );
}

function PunchByEmployeeView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-entries', params],
    queryFn: () => reportsApi.entries(rangeQ(params)),
  });
  const grouped = useMemo(() => {
    const map = new Map<string, { employee: EmployeeRef; inCount: number; outCount: number; first: string; last: string }>();
    for (const r of data?.rows ?? []) {
      const acc = map.get(r.employee.id) ?? { employee: r.employee, inCount: 0, outCount: 0, first: r.date, last: r.date };
      if (r.type === 'IN') acc.inCount += 1;
      else acc.outCount += 1;
      if (r.date < acc.first) acc.first = r.date;
      if (r.date > acc.last) acc.last = r.date;
      map.set(r.employee.id, acc);
    }
    return Array.from(map.values()).sort((a, b) => a.employee.lastName.localeCompare(b.employee.lastName));
  }, [data]);
  const rows = grouped;
  const onExport = () =>
    downloadCsv(
      'kisi-bazinda-giris-cikis.csv',
      ['Sicil', 'Personel', 'Giriş', 'Çıkış', 'Toplam Kayıt', 'İlk Kayıt', 'Son Kayıt'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.inCount, r.outCount, r.inCount + r.outCount, r.first, r.last]),
    );
  return (
    <DataCard
      title="Kişi Bazında Giriş Çıkış Listesi"
      description={`${rows.length} personel`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.employee.id}
        columns={[
          { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employee.employeeNo ?? '—' },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Giriş', className: 'text-right', render: (r) => r.inCount },
          { header: 'Çıkış', className: 'text-right', render: (r) => r.outCount },
          { header: 'Toplam Kayıt', className: 'text-right font-medium', render: (r) => r.inCount + r.outCount },
          { header: 'İlk Kayıt', className: 'text-muted-foreground', render: (r) => r.first },
          { header: 'Son Kayıt', className: 'text-muted-foreground', render: (r) => r.last },
        ]}
      />
    </DataCard>
  );
}

function LateListView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-late', params],
    queryFn: () => reportsApi.late(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'gec-kalanlar.csv',
      ['Tarih', 'Saat', 'Beklenen', 'Gecikme (dk)', 'Vardiya', 'Kaynak', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.time, r.expected, r.lateMinutes, r.shiftUsed ? 'Vardiya' : 'Varsayılan', srcLabel(r.source), r.employee.employeeNo ?? '', person(r.employee)]),
    );
  return (
    <DataCard
      title="Genel Bazda Geç Kalanlar"
      description={`${data?.meta.total ?? 0} kayıt · toplam ${data?.meta.totalLateMinutes ?? 0} dk gecikme`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Giriş', render: (r) => r.time },
          { header: 'Beklenen', className: 'text-muted-foreground', render: (r) => r.expected },
          { header: 'Gecikme', className: 'text-right', render: (r) => <Badge variant="destructive">{durationLabel(r.lateMinutes)}</Badge> },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
        ]}
      />
    </DataCard>
  );
}

function EarlyListView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-early', params],
    queryFn: () => reportsApi.early(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'erken-cikanlar.csv',
      ['Tarih', 'Saat', 'Beklenen', 'Erken (dk)', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.time, r.expected, r.earlyMinutes, r.employee.employeeNo ?? '', person(r.employee)]),
    );
  return (
    <DataCard
      title="Genel Bazda Erken Çıkanlar"
      description={`${data?.meta.total ?? 0} kayıt · toplam ${data?.meta.totalEarlyMinutes ?? 0} dk erken çıkış`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Çıkış', render: (r) => r.time },
          { header: 'Beklenen', className: 'text-muted-foreground', render: (r) => r.expected },
          { header: 'Erken', className: 'text-right', render: (r) => <Badge variant="warning">{durationLabel(r.earlyMinutes)}</Badge> },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
        ]}
      />
    </DataCard>
  );
}

function PerPersonView({
  data,
}: {
  data: { count: number; totalMinutes: number; first: string; last: string; employee: EmployeeRef }[];
}) {
  return (
    <ReportTable
      rows={data}
      keyFn={(r) => r.employee.id}
      columns={[
        { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employee.employeeNo ?? '—' },
        { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
        { header: 'Kayıt', className: 'text-right', render: (r) => r.count },
        { header: 'Toplam Süre', className: 'text-right font-medium', render: (r) => durationLabel(r.totalMinutes) },
        { header: 'İlk', className: 'text-muted-foreground', render: (r) => r.first },
        { header: 'Son', className: 'text-muted-foreground', render: (r) => r.last },
      ]}
    />
  );
}

function LateByEmployeeView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-late', params],
    queryFn: () => reportsApi.late(rangeQ(params)),
  });
  const groups = useMemo(() => {
    const map = new Map<string, { employee: EmployeeRef; count: number; totalMinutes: number; first: string; last: string }>();
    for (const r of data?.rows ?? []) {
      const acc = map.get(r.employee.id) ?? { employee: r.employee, count: 0, totalMinutes: 0, first: r.date, last: r.date };
      acc.count += 1;
      acc.totalMinutes += r.lateMinutes;
      if (r.date < acc.first) acc.first = r.date;
      if (r.date > acc.last) acc.last = r.date;
      map.set(r.employee.id, acc);
    }
    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [data]);
  const onExport = () =>
    downloadCsv(
      'kisi-bazinda-gec-kalanlar.csv',
      ['Sicil', 'Personel', 'Kayıt', 'Toplam Gecikme (dk)', 'İlk', 'Son'],
      groups.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.count, r.totalMinutes, r.first, r.last]),
    );
  return (
    <DataCard
      title="Kişi Bazında Geç Kalanlar"
      description={`${groups.length} personel`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={groups.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || groups.length === 0}
    >
      <PerPersonView data={groups} />
    </DataCard>
  );
}

function EarlyByEmployeeView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-early', params],
    queryFn: () => reportsApi.early(rangeQ(params)),
  });
  const groups = useMemo(() => {
    const map = new Map<string, { employee: EmployeeRef; count: number; totalMinutes: number; first: string; last: string }>();
    for (const r of data?.rows ?? []) {
      const acc = map.get(r.employee.id) ?? { employee: r.employee, count: 0, totalMinutes: 0, first: r.date, last: r.date };
      acc.count += 1;
      acc.totalMinutes += r.earlyMinutes;
      if (r.date < acc.first) acc.first = r.date;
      if (r.date > acc.last) acc.last = r.date;
      map.set(r.employee.id, acc);
    }
    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [data]);
  const onExport = () =>
    downloadCsv(
      'kisi-bazinda-erken-cikanlar.csv',
      ['Sicil', 'Personel', 'Kayıt', 'Toplam Erken (dk)', 'İlk', 'Son'],
      groups.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.count, r.totalMinutes, r.first, r.last]),
    );
  return (
    <DataCard
      title="Kişi Bazında Erken Çıkanlar"
      description={`${groups.length} personel`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={groups.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || groups.length === 0}
    >
      <PerPersonView data={groups} />
    </DataCard>
  );
}

function OvertimeView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-ot', params],
    queryFn: () => reportsApi.overtimes(rangeQ(params)),
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const rows = data?.summary ?? [];
  const onExport = () => {
    void (async () => {
      try {
        downloadExcel(await reportsApi.overtimesExcel(rangeQ(params)));
      } catch (err) {
        setExportError(formatError(err));
      }
    })();
  };
  return (
    <DataCard
      title="Mesaiye Kalanlar"
      description={`${data?.meta.totalHours ?? 0} onaylı saat · ${data?.meta.records ?? 0} kayıt`}
      loading={isLoading}
      error={exportError ?? (error ? formatError(error) : null)}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.employee.id}
        columns={[
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Onaylı Saat', className: 'text-right font-medium', render: (r) => r.approvedHours },
          { header: 'Toplam Saat', className: 'text-right text-muted-foreground', render: (r) => r.totalHours },
          { header: 'Kayıt', className: 'text-right', render: (r) => r.records },
        ]}
      />
    </DataCard>
  );
}

function AbsenceView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-abs', params],
    queryFn: () => reportsApi.absences(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'devamsizlar.csv',
      ['Tarih', 'Gün', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.dayName, r.employee.employeeNo ?? '', person(r.employee)]),
    );
  return (
    <DataCard
      title="Devamsızlar Listesi"
      description={`${data?.meta.total ?? 0} devamsızlık · ${data?.meta.days ?? 0} iş günü`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable<AbsenceRow>
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Gün', render: (r) => r.dayName },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: '', render: () => <Badge variant="destructive">Devamsız</Badge> },
        ]}
      />
    </DataCard>
  );
}

function NonCardView({ params, side }: { params: ReportParams; side: 'IN' | 'OUT' | 'BOTH' }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-noncard', side, params],
    queryFn: () => reportsApi.nonCard(side, rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'kart-kullanmayanlar.csv',
      ['Tarih', 'Saat', 'Tür', 'Kaynak', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.time, typeLabel(r.type), srcLabel(r.source), r.employee.employeeNo ?? '', person(r.employee)]),
    );
  const title =
    side === 'IN' ? 'Girişte Kart Kullanmayanlar' : side === 'OUT' ? 'Çıkışta Kart Kullanmayanlar' : 'Giriş veya Çıkışta Kart Kullanmayanlar';
  return (
    <DataCard
      title={title}
      description={`${data?.meta.total ?? 0} kayıt · kart dışı (QR/PDKS/Manuel) hareketler`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${r.time}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Saat', render: (r) => r.time },
          { header: 'Tür', render: (r) => <Badge variant={r.type === 'IN' ? 'success' : 'secondary'}>{typeLabel(r.type)}</Badge> },
          { header: 'Kaynak', render: (r) => srcLabel(r.source) },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
        ]}
      />
    </DataCard>
  );
}

function PresentNowView() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['rep-present-now'],
    queryFn: () => reportsApi.presentNow(),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'icerideki-personeller.csv',
      ['Sicil', 'Personel', 'İlk Giriş', 'Son Giriş', 'İçeride (dk)'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.firstIn, r.lastIn, r.sinceMinutes]),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Şu An İçerideki Personeller</CardTitle>
          <CardDescription>{data ? `Tarih: ${data.date} · ${rows.length} personel` : 'Canlı görünüm'}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            Yenile
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} disabled={isLoading || rows.length === 0}>
            <Download /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{formatError(error)}</p>
        ) : isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyRows text="Şu an içeride kimse görünmüyor" />
        ) : (
          <ReportTable<PresentNowRow>
            rows={rows}
            keyFn={(r) => r.employee.id}
            columns={[
              { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
              { header: 'İlk Giriş', className: 'text-muted-foreground', render: (r) => new Date(r.firstIn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
              { header: 'Son Giriş', render: (r) => new Date(r.lastIn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
              { header: 'İçeride', className: 'text-right font-medium', render: (r) => <Badge variant="success">{durationLabel(r.sinceMinutes)}</Badge> },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ManualPunchesView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-manual', params],
    queryFn: () => reportsApi.manual(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'elle-mudahale.csv',
      ['Tarih', 'Saat', 'Tür', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.time, typeLabel(r.type), r.employee.employeeNo ?? '', person(r.employee)]),
    );
  return (
    <DataCard
      title="Elle Müdahale Yapılmış Hareketler"
      description={`${data?.meta.total ?? 0} kayıt`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${r.time}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Saat', render: (r) => r.time },
          { header: 'Tür', render: (r) => <Badge variant={r.type === 'IN' ? 'success' : 'secondary'}>{typeLabel(r.type)}</Badge> },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: '', render: () => <Badge variant="outline">Manuel</Badge> },
        ]}
      />
    </DataCard>
  );
}

function DutyView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-duty', params.employeeId],
    queryFn: () => shiftApi.assignments(params.employeeId ? { employeeId: params.employeeId } : undefined),
  });
  const rows = data ?? [];
  const sorted = [...rows].sort(
    (a, b) => `${a.employee.lastName} ${a.employee.firstName}`.localeCompare(`${b.employee.lastName} ${b.employee.firstName}`),
  );
  const onExport = () =>
    downloadCsv(
      'nobet-bilgileri.csv',
      ['Sicil', 'Personel', 'Gün', 'Vardiya', 'Başlangıç', 'Bitiş', 'Süre'],
      sorted.map((r) => [
        r.employee.employeeNo ?? '',
        person(r.employee),
        SHIFT_DAY_LABEL[r.day],
        r.shift.name,
        r.shift.startTime,
        r.shift.endTime,
        shiftDuration(r.shift.startTime, r.shift.endTime, 0),
      ]),
    );
  return (
    <DataCard
      title="Personellerin Nöbet Bilgileri"
      description={`${sorted.length} vardiya ataması`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={sorted.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || sorted.length === 0}
    >
      <ReportTable
        rows={sorted}
        keyFn={(r) => r.id}
        columns={[
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Gün', render: (r) => SHIFT_DAY_LABEL[r.day] },
          { header: 'Vardiya', render: (r) => r.shift.name },
          { header: 'Başlangıç', className: 'text-right', render: (r) => r.shift.startTime },
          { header: 'Bitiş', className: 'text-right', render: (r) => r.shift.endTime },
          { header: 'Süre', className: 'text-right text-muted-foreground', render: (r) => shiftDuration(r.shift.startTime, r.shift.endTime, 0) },
        ]}
      />
    </DataCard>
  );
}

function ContactView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-contacts'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });
  const rows = data?.items ?? [];
  const onExport = () =>
    downloadCsv(
      'irtibat-bilgileri.csv',
      ['Sicil', 'Personel', 'Departman', 'Birim', 'Pozisyon', 'Telefon', 'E-posta'],
      rows.map((r) => [r.employeeNo ?? '', person(r), r.department?.name ?? '', r.unit?.name ?? '', r.position?.name ?? '', r.phone ?? '', r.email ?? '']),
    );
  return (
    <DataCard
      title="Personellerin İrtibat Bilgileri"
      description={`${rows.length} personel`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable<Employee>
        rows={rows}
        keyFn={(r) => r.id}
        columns={[
          { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employeeNo ?? '—' },
          { header: 'Personel', render: (r) => `${r.firstName} ${r.lastName}` },
          { header: 'Departman', render: (r) => r.department?.name ?? '—' },
          { header: 'Birim', render: (r) => r.unit?.name ?? '—' },
          { header: 'Pozisyon', render: (r) => r.position?.name ?? '—' },
          { header: 'Telefon', className: 'text-muted-foreground', render: (r) => r.phone ?? '—' },
          { header: 'E-posta', className: 'text-muted-foreground', render: (r) => r.email ?? '—' },
        ]}
      />
    </DataCard>
  );
}

function NewHireView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-new-hires', params],
    queryFn: () => reportsApi.newHires(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'ise-girenler.csv',
      ['Sicil', 'Personel', 'İşe Giriş', 'Durum', 'Departman', 'Birim', 'Lokasyon', 'Ünvan'],
      rows.map((r) => [r.employeeNo ?? '', `${r.firstName} ${r.lastName}`, r.startDate, r.status, r.department ?? '', r.unit ?? '', r.location ?? '', r.title ?? '']),
    );
  return (
    <DataCard
      title="İşe Giren Personeller"
      description={`${data?.meta.total ?? 0} kişi`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable<NewHireRow>
        rows={rows}
        keyFn={(r, i) => `${r.employeeNo ?? ''}-${r.startDate}-${i}`}
        columns={[
          { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employeeNo ?? '—' },
          { header: 'Personel', render: (r) => `${r.firstName} ${r.lastName}` },
          { header: 'İşe Giriş', render: (r) => r.startDate },
          { header: 'Departman', render: (r) => r.department ?? '—' },
          { header: 'Lokasyon', className: 'text-muted-foreground', render: (r) => r.location ?? '—' },
          { header: 'Ünvan', className: 'text-muted-foreground', render: (r) => r.title ?? '—' },
        ]}
      />
    </DataCard>
  );
}

function TerminationView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-terminations', params],
    queryFn: () => reportsApi.terminations(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'isten-ayrilanlar.csv',
      ['Sicil', 'Personel', 'İşten Ayrılış', 'Durum', 'Departman', 'Ünvan'],
      rows.map((r) => [r.employeeNo ?? '', `${r.firstName} ${r.lastName}`, r.endDate, r.status, r.department ?? '', r.title ?? '']),
    );
  return (
    <DataCard
      title="İşten Ayrılan Personeller"
      description={`${data?.meta.total ?? 0} kişi`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable<TerminationRow>
        rows={rows}
        keyFn={(r, i) => `${r.employeeNo ?? ''}-${r.endDate}-${i}`}
        columns={[
          { header: 'Sicil', className: 'font-mono text-xs text-muted-foreground', render: (r) => r.employeeNo ?? '—' },
          { header: 'Personel', render: (r) => `${r.firstName} ${r.lastName}` },
          { header: 'İşten Ayrılış', render: (r) => r.endDate },
          { header: 'Departman', render: (r) => r.department ?? '—' },
          { header: 'Ünvan', className: 'text-muted-foreground', render: (r) => r.title ?? '—' },
        ]}
      />
    </DataCard>
  );
}

function WeekendView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-weekend', params],
    queryFn: () => reportsApi.weekendWork(rangeQ(params)),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      'tatil-calisanlar.csv',
      ['Tarih', 'Gün', 'Giriş', 'Çıkış', 'Çalışılan', 'Sicil', 'Personel'],
      rows.map((r) => [r.date, r.dayName, r.in, r.out, r.worked, r.employee.employeeNo ?? '', person(r.employee)]),
    );
  return (
    <DataCard
      title="Tatil Günü (Hafta Sonu) Çalışanlar"
      description={`${data?.meta.total ?? 0} kayıt`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable<WeekendRow>
        rows={rows}
        keyFn={(r, i) => `${r.employee.id}-${r.date}-${i}`}
        columns={[
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date },
          { header: 'Gün', render: (r) => r.dayName },
          { header: 'Giriş', render: (r) => r.in },
          { header: 'Çıkış', render: (r) => r.out },
          { header: 'Çalışılan', className: 'text-right font-medium', render: (r) => r.worked },
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
        ]}
      />
    </DataCard>
  );
}

function LeaveView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-lv', params],
    queryFn: () => reportsApi.leaves(rangeQ(params)),
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const rows = data?.summary ?? [];
  const typeNames = Array.from(new Set(rows.flatMap((r) => Object.keys(r.byType))));
  const onExport = () => {
    void (async () => {
      try {
        downloadExcel(await reportsApi.leavesExcel(rangeQ(params)));
      } catch (err) {
        setExportError(formatError(err));
      }
    })();
  };
  return (
    <DataCard
      title="İzin Kullananlar"
      description={`${data?.meta.totalDays ?? 0} onaylı gün · ${data?.meta.records ?? 0} istek`}
      loading={isLoading}
      error={exportError ?? (error ? formatError(error) : null)}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.employee.id}
        columns={[
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Onaylı', className: 'text-right font-medium', render: (r) => r.approvedDays },
          { header: 'Bekleyen', className: 'text-right', render: (r) => r.pendingDays },
          { header: 'Toplam', className: 'text-right', render: (r) => r.totalDays },
          ...typeNames.map<Column<(typeof rows)[number]>>((t) => ({
            header: t,
            className: 'text-right text-muted-foreground',
            render: (r) => r.byType[t] ?? 0,
          })),
        ]}
      />
    </DataCard>
  );
}

function AdvanceView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-advances', params.month],
    queryFn: () => advanceApi.list({ pageSize: 500 }),
  });
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const rows = (data?.items ?? []).filter((r) => r.periodYear === year && r.periodMonth === m);
  const onExport = () =>
    downloadCsv(
      'avans-listesi.csv',
      ['Sicil', 'Personel', 'Tutar', 'Taksit', 'Dönem', 'Durum', 'Açıklama', 'Tarih'],
      rows.map((r) => [
        r.employee.employeeNo ?? '',
        person(r.employee),
        r.amount,
        r.installmentCount,
        `${monthLabel(r.periodMonth)} ${r.periodYear}`,
        ADVANCE_STATUS_META[r.status].label,
        r.description ?? '',
        r.createdAt.slice(0, 10),
      ]),
    );
  return (
    <DataCard
      title="Avans Listesi"
      description={month ? `${monthLabel(m)} ${year} · ${rows.length} avans` : 'Avans talepleri'}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.id}
        columns={[
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Tutar', className: 'text-right font-medium', render: (r) => formatMoney(r.amount) },
          { header: 'Taksit', className: 'text-right', render: (r) => r.installmentCount },
          { header: 'Durum', render: (r) => <Badge variant={ADVANCE_STATUS_META[r.status].variant}>{ADVANCE_STATUS_META[r.status].label}</Badge> },
          { header: 'Açıklama', className: 'text-muted-foreground', render: (r) => r.description ?? '—' },
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.createdAt.slice(0, 10) },
        ]}
      />
    </DataCard>
  );
}

function BonusView({ params }: { params: ReportParams }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-bonus', params],
    queryFn: () => bonusApi.list({ pageSize: 500 }),
  });
  const rows = useMemo(() => {
    const source = data?.items ?? [];
    return source
      .filter(
        (r) =>
          (!params.from || (r.date ?? '') >= params.from) &&
          (!params.to || (r.date ?? '') <= params.to),
      )
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [data, params.from, params.to]);
  const onExport = () =>
    downloadCsv(
      'prim-listesi.csv',
      ['Sicil', 'Personel', 'Tutar', 'Tarih', 'Durum', 'Açıklama'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.amount, r.date?.slice(0, 10) ?? '', BONUS_STATUS_META[r.status].label, r.description ?? '']),
    );
  return (
    <DataCard
      title="Prim Listesi"
      description={`${rows.length} prim kaydı`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.id}
        columns={[
          { header: 'Personel', render: (r) => FULL_NAME(r.employee) },
          { header: 'Tutar', className: 'text-right font-medium', render: (r) => formatMoney(r.amount) },
          { header: 'Tarih', className: 'text-muted-foreground', render: (r) => r.date?.slice(0, 10) ?? '—' },
          { header: 'Durum', render: (r) => <Badge variant={BONUS_STATUS_META[r.status].variant}>{BONUS_STATUS_META[r.status].label}</Badge> },
          { header: 'Açıklama', className: 'text-muted-foreground', render: (r) => r.description ?? '—' },
        ]}
      />
    </DataCard>
  );
}

function MonthlyAttendanceView({ params }: { params: ReportParams }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-monthly-att', month],
    queryFn: () => reportsApi.monthlyAttendance(month),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      `aylik-devam-${data?.label ?? month}.csv`,
      ['Sicil', 'Personel', ...(data?.weekdays ?? []).map((d) => `${d.date.slice(8, 10)} ${d.dayName.slice(0, 3)}`), 'Çalışılan Gün', 'Toplam Süre'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), ...seqToArray(r.seq, data?.weekdays?.length ?? 0), r.presentCount, r.worked]),
    );
  const seqToArray = (seq: string, len: number) => Array.from({ length: len }, (_, i) => seq[i] ?? ' ');
  return (
    <DataCard
      title="Aylık Devam Listesi"
      description={`${data?.label ?? month} · ${data?.meta.days ?? 0} iş günü · ${data?.meta.workedDays ?? 0} personel günü kaydı`}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0 || !data}
    >
      <div>
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-3 rounded bg-emerald-100 text-center text-[10px] leading-3 text-emerald-700">P</span> Çalıştı</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded bg-amber-100 text-center text-[10px] leading-3 text-amber-700">İ</span> İzinli</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded bg-red-100 text-center text-[10px] leading-3 text-red-700">A</span> Devamsız</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">Personel</TableHead>
                {(data?.weekdays ?? []).map((d) => (
                  <TableHead key={d.date} className="px-1 text-center text-[10px] font-normal text-muted-foreground">
                    <div>{d.date.slice(8, 10)}</div>
                    <div>{d.dayName.slice(0, 3)}</div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Gün</TableHead>
                <TableHead className="text-center">Süre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">{FULL_NAME(row.employee)}</TableCell>
                  {(data?.weekdays ?? []).map((d, i) => (
                    <TableCell
                      key={d.date}
                      className={cn(
                        'px-1 text-center text-[10px] font-medium',
                        (row.seq[i] ?? ' ') === 'P' && 'bg-emerald-50 text-emerald-700',
                        (row.seq[i] ?? ' ') === 'A' && 'bg-red-50 text-red-700',
                        (row.seq[i] ?? ' ') === 'İ' && 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {(row.seq[i] ?? ' ') === ' ' ? '\u00A0' : row.seq[i]}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-medium">{row.presentCount}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{row.worked}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DataCard>
  );
}

// ─────────────────────────────────────────────────────────────
// HESAP rapor görünümleri
// ─────────────────────────────────────────────────────────────

function PayrunView({ params }: { params: ReportParams }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-payrun', month],
    queryFn: () => reportsApi.payrun(month),
  });
  const rows = data?.rows ?? [];
  const onExport = () =>
    downloadCsv(
      `puantaj-hesaplama-${data?.label ?? month}.csv`,
      ['Sicil', 'Personel', 'Departman', 'Çalışma Günü', 'Çalışma Süresi', 'Brüt', 'Mesai Saat', 'Mesai Tutarı', 'Ücretsiz Gün', 'İzin Kesintisi', 'Toplam Brüt', 'Net'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.department ?? '', r.workedDays, r.worked, r.baseSalary, r.overtimeHours, r.overtimeAmount, r.unpaidLeaveDays, r.leaveDeduction, r.grossAmount, r.netAmount]),
    );
  return (
    <DataCard
      title="Puantaj Hesaplama"
      description={
        data
          ? `${data.label} · ${data.meta.employees} personel · Net toplam ${formatMoney(data.meta.totalNet)}`
          : 'Aylık puantaj ve maaş hesaplaması'
      }
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Personel</TableHead>
            <TableHead className="text-right">Brüt</TableHead>
            <TableHead className="text-right">Mesai (sa)</TableHead>
            <TableHead className="text-right">Mesai ₺</TableHead>
            <TableHead className="text-right">Ücretsiz Gün</TableHead>
            <TableHead className="text-right">İzin Kesintisi</TableHead>
            <TableHead className="text-right">Toplam Brüt</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-center">Çalışma</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.employee.id}>
              <TableCell className="whitespace-nowrap">{FULL_NAME(row.employee)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.baseSalary)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{row.overtimeHours}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.overtimeAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{row.unpaidLeaveDays}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.leaveDeduction)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatMoney(row.grossAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold text-emerald-700">{formatMoney(row.netAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-center text-muted-foreground">{row.workedDays} g · {row.worked}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataCard>
  );
}

function PayrollSummaryView({ params }: { params: ReportParams }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-payroll', year, m],
    queryFn: () => payrollApi.list({ pageSize: 500, periodYear: year, periodMonth: m }),
  });
  const rows = data?.items ?? [];
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);
  const onExport = () =>
    downloadCsv(
      `maas-ekstresi-${year}-${String(m).padStart(2, '0')}.csv`,
      ['Sicil', 'Personel', 'Brüt', 'Mesai', 'İzin Kesintisi', 'Prim', 'Ek Kesinti', 'Toplam Brüt', 'Net', 'Durum'],
      rows.map((r) => [r.employee.employeeNo ?? '', person(r.employee), r.baseSalary, r.overtimeAmount, r.leaveDeduction, r.bonus ?? 0, r.deduction ?? 0, r.grossAmount, r.netAmount, PAYROLL_STATUS_META[r.status].label]),
    );
  return (
    <DataCard
      title="Genel Bazda Maaş Ekstresi"
      description={
        data
          ? `${monthLabel(m)} ${year} · ${rows.length} kayıt · Net toplam ${formatMoney(totalNet)}`
          : 'Dönem maaş ekstresi'
      }
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Personel</TableHead>
            <TableHead className="text-right">Brüt</TableHead>
            <TableHead className="text-right">Mesai</TableHead>
            <TableHead className="text-right">İzin Kes.</TableHead>
            <TableHead className="text-right">Prim</TableHead>
            <TableHead className="text-right">Ek Kes.</TableHead>
            <TableHead className="text-right">Toplam Brüt</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">{FULL_NAME(row.employee)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.baseSalary)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.overtimeAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.leaveDeduction)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.bonus ?? 0)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.deduction ?? 0)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatMoney(row.grossAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold text-emerald-700">{formatMoney(row.netAmount)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant={PAYROLL_STATUS_META[row.status].variant}>{PAYROLL_STATUS_META[row.status].label}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow>
              <TableCell className="font-semibold" colSpan={7}>Toplam</TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(totalNet)}</TableCell>
              <TableCell />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </DataCard>
  );
}

function PayrollByEmployeeView({ params }: { params: ReportParams }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-payroll-emp', params.month, params.employeeId],
    queryFn: () => payrollApi.list({ pageSize: 500, periodYear: year, periodMonth: m, employeeId: params.employeeId }),
    enabled: !!params.employeeId,
  });
  const rows = data?.items ?? [];
  if (!params.employeeId) {
    return <p className="text-sm text-muted-foreground">Devam etmek için listeden bir personel seçin.</p>;
  }
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);
  const onExport = () =>
    downloadCsv(
      `kisi-maas-ekstresi-${data?.items?.[0]?.employee?.firstName ?? ''}.csv`,
      ['Dönem', 'Brüt', 'Mesai', 'İzin Kes.', 'Prim', 'Ek Kes.', 'Toplam', 'Net', 'Durum'],
      rows.map((r) => [`${monthLabel(r.periodMonth)} ${r.periodYear}`, r.baseSalary, r.overtimeAmount, r.leaveDeduction, r.bonus ?? 0, r.deduction ?? 0, r.grossAmount, r.netAmount, PAYROLL_STATUS_META[r.status].label]),
    );
  return (
    <DataCard
      title="Kişi Bazında Maaş Ekstresi"
      description={data ? `${rows.length} dönem kaydı · Net toplam ${formatMoney(totalNet)}` : 'Seçili personelin dönem kayıtları'}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dönem</TableHead>
            <TableHead className="text-right">Brüt</TableHead>
            <TableHead className="text-right">Mesai</TableHead>
            <TableHead className="text-right">İzin Kes.</TableHead>
            <TableHead className="text-right">Prim</TableHead>
            <TableHead className="text-right">Ek Kes.</TableHead>
            <TableHead className="text-right">Toplam</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">{monthLabel(row.periodMonth)} {row.periodYear}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.baseSalary)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.overtimeAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.leaveDeduction)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatMoney(row.bonus ?? 0)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">{formatMoney(row.deduction ?? 0)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatMoney(row.grossAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold text-emerald-700">{formatMoney(row.netAmount)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant={PAYROLL_STATUS_META[row.status].variant}>{PAYROLL_STATUS_META[row.status].label}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataCard>
  );
}

function PayslipView({ params, employees }: { params: ReportParams; employees: Employee[] }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const employee = employees.find((e) => e.id === params.employeeId);
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-payslip', params.month, params.employeeId],
    queryFn: () => payrollApi.list({ pageSize: 5, periodYear: year, periodMonth: m, employeeId: params.employeeId }),
    enabled: !!params.employeeId,
  });
  const item = data?.items?.[0];
  if (!params.employeeId) {
    return <p className="text-sm text-muted-foreground">Pusula görüntülemek için listeden bir personel seçin.</p>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maaş Pusulası</CardTitle>
        <CardDescription>
          {employee ? `${employee.firstName} ${employee.lastName}${employee.employeeNo ? ` (${employee.employeeNo})` : ''}` : ''} · {monthLabel(m)} {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{formatError(error)}</p>
        ) : isLoading ? (
          <LoadingRows />
        ) : !item ? (
          <EmptyRows text="Bu dönem için bordro kaydı bulunamadı" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PayslipCell label="Brüt Maaş" value={formatMoney(item.baseSalary)} />
            <PayslipCell label="Mesai" value={`+ ${formatMoney(item.overtimeAmount)}`} />
            <PayslipCell label="Ücretsiz İzin Kesintisi" value={`- ${formatMoney(item.leaveDeduction)}`} />
            <PayslipCell label="Prim" value={`+ ${formatMoney(item.bonus ?? 0)}`} />
            <PayslipCell label="Ek Kesinti" value={`- ${formatMoney(item.deduction ?? 0)}`} />
            <PayslipCell label="Toplam Brüt" value={formatMoney(item.grossAmount)} />
            <div className="col-span-full">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">NET ÖDENECEK</span>
                <span className="text-lg font-bold text-emerald-700">{formatMoney(item.netAmount)}</span>
              </div>
            </div>
            {item.note && (
              <div className="col-span-full text-xs text-muted-foreground">
                Not: {item.note}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayslipCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function PayrollGroupView({ params }: { params: ReportParams }) {
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const { data, isLoading, error } = useQuery({
    queryKey: ['rep-payrun', month],
    queryFn: () => reportsApi.payrun(month),
  });
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; employees: number; base: number; otHours: number; otAmount: number; deduction: number; gross: number; net: number }>();
    for (const r of data?.rows ?? []) {
      const name = r.department ?? 'Departmansız';
      const acc = map.get(name) ?? { name, employees: 0, base: 0, otHours: 0, otAmount: 0, deduction: 0, gross: 0, net: 0 };
      acc.employees += 1;
      acc.base += r.baseSalary;
      acc.otHours += r.overtimeHours;
      acc.otAmount += r.overtimeAmount;
      acc.deduction += r.leaveDeduction;
      acc.gross += r.grossAmount;
      acc.net += r.netAmount;
      map.set(name, acc);
    }
    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [data]);
  const rows = groups;
  const onExport = () =>
    downloadCsv(
      `grup-maas-ekstresi-${data?.label ?? month}.csv`,
      ['Departman / Grup', 'Personel', 'Brüt', 'Mesai Saat', 'Mesai ₺', 'İzin Kesintisi', 'Toplam Brüt', 'Net'],
      rows.map((r) => [r.name, r.employees, r.base, Math.round(r.otHours * 100) / 100, r.otAmount, r.deduction, r.gross, r.net]),
    );
  return (
    <DataCard
      title="Grup Bazlı Maaş Ekstresi"
      description={data ? `${data.label} · ${rows.length} grup` : 'Departman bazlı özet'}
      loading={isLoading}
      error={error ? formatError(error) : null}
      empty={rows.length === 0}
      onExport={onExport}
      exportDisabled={isLoading || rows.length === 0}
    >
      <ReportTable
        rows={rows}
        keyFn={(r) => r.name}
        columns={[
          { header: 'Departman / Grup', render: (r) => r.name },
          { header: 'Personel', className: 'text-right', render: (r) => r.employees },
          { header: 'Brüt', className: 'text-right text-muted-foreground', render: (r) => formatMoney(r.base) },
          { header: 'Mesai ₺', className: 'text-right', render: (r) => formatMoney(r.otAmount) },
          { header: 'İzin Kesintisi', className: 'text-right', render: (r) => formatMoney(r.deduction) },
          { header: 'Toplam Brüt', className: 'text-right font-medium', render: (r) => formatMoney(r.gross) },
          { header: 'Net', className: 'text-right font-semibold text-emerald-700', render: (r) => formatMoney(r.net) },
        ]}
      />
    </DataCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Katalog tanımları
// ─────────────────────────────────────────────────────────────

export const GENEL_REPORTS: ReportDef[] = [
  { id: 'genel-giris-cikis', section: 'genel', title: 'Genel Bazda Giriş Çıkış Listesi', description: 'Tüm giriş-çıkış hareketleri (kayıt bazlı)', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'kisi-giris-cikis', section: 'genel', title: 'Kişi Bazında Giriş Çıkış Listesi', description: 'Personel bazında giriş/çıkış özeti', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'genel-gec-kalanlar', section: 'genel', title: 'Genel Bazda Geç Kalanlar Listesi', description: 'Vardiya başlangıcından geç giriş yapanlar', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'kisi-gec-kalanlar', section: 'genel', title: 'Kişi Bazında Geç Kalanlar Listesi', description: 'Personel bazında geç kalma özeti', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'genel-erken-cikanlar', section: 'genel', title: 'Genel Bazda Erken Çıkanlar Listesi', description: 'Vardiya bitiminden erken çıkanlar', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'kisi-erken-cikanlar', section: 'genel', title: 'Kişi Bazında Erken Çıkanlar Listesi', description: 'Personel bazında erken çıkış özeti', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'mesai', section: 'genel', title: 'Mesaiye Kalanlar Listesi', description: 'Onaylı mesai saatleri özeti', permission: 'overtime:read', kind: 'range', employee: true },
  { id: 'devamsizlar', section: 'genel', title: 'Devamsızlar Listesi', description: 'İş gününde (Pzt-Cum) hiç giriş yapmayanlar', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'giris-kart-yok', section: 'genel', title: 'Girişte Kart Kullanmayanlar', description: 'Giriş hareketleri kart dışı kaynaklı olanlar', permission: 'attendance:read', kind: 'range', employee: true, side: 'IN' },
  { id: 'cikis-kart-yok', section: 'genel', title: 'Çıkışta Kart Kullanmayanlar', description: 'Çıkış hareketleri kart dışı kaynaklı olanlar', permission: 'attendance:read', kind: 'range', employee: true, side: 'OUT' },
  { id: 'kart-yok', section: 'genel', title: 'Giriş veya Çıkışta Kart Kullanmayanlar', description: 'Kart dışı tüm kaynaklı hareketler', permission: 'attendance:read', kind: 'range', employee: true, side: 'BOTH' },
  { id: 'iceride', section: 'genel', title: 'Şu an İçerideki Personeller', description: 'Gün içinde girişi olup çıkışı olmayanlar', permission: 'attendance:read', kind: 'none' },
  { id: 'elle-mudahale', section: 'genel', title: 'Elle Müdahale Yapılmış Hareketler', description: 'Manuel kaynaklı giriş-çıkış kayıtları', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'nobet', section: 'genel', title: 'Personellerin Nöbet Bilgileri', description: 'Vardiya/Nöbet atama çizelgesi', permission: 'shift:read', kind: 'none', employee: true },
  { id: 'irtibat', section: 'genel', title: 'Personellerin İrtibat Bilgileri', description: 'Telefon, e-posta ve birim bilgileri', permission: 'employee:read', kind: 'none' },
  { id: 'ise-girenler', section: 'genel', title: 'İşe Giren Personeller', description: 'Seçilen dönemde işe başlayanlar', permission: 'employee:read', kind: 'range' },
  { id: 'isten-ayrilanlar', section: 'genel', title: 'İşten Ayrılan Personeller', description: 'Seçilen dönemde işten ayrılanlar', permission: 'employee:read', kind: 'range' },
  { id: 'tatil-calisan', section: 'genel', title: 'Tatil Günü Çalışanlar', description: 'Cumartesi/Pazar günü giriş-çıkış yapanlar', permission: 'attendance:read', kind: 'range', employee: true },
  { id: 'izin', section: 'genel', title: 'İzin Kullananlar', description: 'İzin özeti (onaylı/bekleyen/türe göre)', permission: 'leave:read', kind: 'range', employee: true },
  { id: 'avans', section: 'genel', title: 'Avans Listesi', description: 'Döneme göre avans talepleri', permission: 'advance:read', kind: 'month' },
  { id: 'prim', section: 'genel', title: 'Prim Listesi', description: 'Verilen primler ve durumları', permission: 'bonus:read', kind: 'range' },
  { id: 'aylik-devam', section: 'genel', title: 'Aylık Devam Listesi', description: 'Personel × iş günü devam grafiği (P/İ/A)', permission: 'attendance:read', kind: 'month', wide: true },
];

export const HESAP_REPORTS: ReportDef[] = [
  { id: 'puantaj', section: 'hesap', title: 'Puantaj Hesaplama', description: 'Aylık puantaj ve maaş hesaplama (kaydetmeden)', permission: 'payroll:read', kind: 'month' },
  { id: 'maas-genel', section: 'hesap', title: 'Genel Bazda Maaş Ekstresi', description: 'Dönemdeki tüm bordro kayıtları', permission: 'payroll:read', kind: 'month' },
  { id: 'maas-kisi', section: 'hesap', title: 'Kişi Bazında Maaş Ekstresi', description: 'Tek personelin dönem bordro geçmişi', permission: 'payroll:read', kind: 'month', employee: true },
  { id: 'maas-pusula', section: 'hesap', title: 'Maaş Pusulası', description: 'Personel ve dönem için maaş pusulası', permission: 'payroll:read', kind: 'month', employee: true },
  { id: 'maas-grup', section: 'hesap', title: 'Grup Bazlı Maaş Ekstresi', description: 'Departmana göre maaş özeti', permission: 'payroll:read', kind: 'month' },
];

export function ReportView({
  def,
  params,
  employees,
}: {
  def: ReportDef;
  params: ReportParams;
  employees: Employee[];
}) {
  switch (def.id) {
    case 'genel-giris-cikis':
      return <PunchListView params={params} />;
    case 'kisi-giris-cikis':
      return <PunchByEmployeeView params={params} />;
    case 'genel-gec-kalanlar':
      return <LateListView params={params} />;
    case 'kisi-gec-kalanlar':
      return <LateByEmployeeView params={params} />;
    case 'genel-erken-cikanlar':
      return <EarlyListView params={params} />;
    case 'kisi-erken-cikanlar':
      return <EarlyByEmployeeView params={params} />;
    case 'mesai':
      return <OvertimeView params={params} />;
    case 'devamsizlar':
      return <AbsenceView params={params} />;
    case 'giris-kart-yok':
      return <NonCardView params={params} side="IN" />;
    case 'cikis-kart-yok':
      return <NonCardView params={params} side="OUT" />;
    case 'kart-yok':
      return <NonCardView params={params} side="BOTH" />;
    case 'iceride':
      return <PresentNowView />;
    case 'elle-mudahale':
      return <ManualPunchesView params={params} />;
    case 'nobet':
      return <DutyView params={params} />;
    case 'irtibat':
      return <ContactView />;
    case 'ise-girenler':
      return <NewHireView params={params} />;
    case 'isten-ayrilanlar':
      return <TerminationView params={params} />;
    case 'tatil-calisan':
      return <WeekendView params={params} />;
    case 'izin':
      return <LeaveView params={params} />;
    case 'avans':
      return <AdvanceView params={params} />;
    case 'prim':
      return <BonusView params={params} />;
    case 'aylik-devam':
      return <MonthlyAttendanceView params={params} />;
    case 'puantaj':
      return <PayrunView params={params} />;
    case 'maas-genel':
      return <PayrollSummaryView params={params} />;
    case 'maas-kisi':
      return <PayrollByEmployeeView params={params} />;
    case 'maas-pusula':
      return <PayslipView params={params} employees={employees} />;
    case 'maas-grup':
      return <PayrollGroupView params={params} />;
    default:
      return <p className="text-sm text-muted-foreground">Rapor bulunamadı.</p>;
  }
}