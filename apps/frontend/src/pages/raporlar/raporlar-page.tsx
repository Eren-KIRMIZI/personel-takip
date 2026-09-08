import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { employeesApi } from '@/features/personel/api';
import {
  downloadExcel,
  durationLabel,
  FULL_NAME,
  reportsApi,
  type AttendanceLogRow,
  type AttendanceSummaryRow,
  type LeaveSummaryRow,
  type OvertimeSummaryRow,
} from '@/features/raporlar/api';
import { formatError } from '@/lib/utils';

const LAST_30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

const srcLabel = (s?: 'QR' | 'MANUAL' | 'PDKS' | 'CARD' | null) =>
  s === 'QR' ? 'QR' : s === 'MANUAL' ? 'Manuel' : s === 'PDKS' ? 'PDKS' : s === 'CARD' ? 'Kart' : '—';

const hhmm = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—');

export function RaporlarPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [from, setFrom] = useState(LAST_30);
  const [to, setTo] = useState(TODAY);
  const [employeeId, setEmployeeId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const params = { from: from || undefined, to: to || undefined, employeeId: employeeId || undefined };

  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const attendance = useQuery({ queryKey: ['report-att', params], queryFn: () => reportsApi.attendance(params), enabled: hasPermission('attendance:read') });
  const overtimes = useQuery({ queryKey: ['report-ot', params], queryFn: () => reportsApi.overtimes(params), enabled: hasPermission('overtime:read') });
  const leaves = useQuery({ queryKey: ['report-lv', params], queryFn: () => reportsApi.leaves(params), enabled: hasPermission('leave:read') });
  const attendanceLog = useQuery({ queryKey: ['report-attlog', params], queryFn: () => reportsApi.attendanceLog(params), enabled: hasPermission('attendance:read') });

  const onExport = (kind: 'att' | 'ot' | 'lv' | 'attlog'): void => {
    const run = async () => {
      try {
        const fn =
          kind === 'att'
            ? reportsApi.attendanceExcel
            : kind === 'ot'
              ? reportsApi.overtimesExcel
              : kind === 'lv'
                ? reportsApi.leavesExcel
                : reportsApi.attendanceLogExcel;
        downloadExcel(await fn(params));
      } catch (err) {
        setErrorMessage(formatError(err));
      }
    };
    void run();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Raporlar" description="Çalışma süresi, mesai ve izin özetleri" />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Başlangıç</label>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Bitiş</label>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Personel (isteğe bağlı)</label>
          <Select className="w-64" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Tüm personel</option>
            {employees?.items.map((emp) => (
              <option key={emp.id} value={emp.id}>{FULL_NAME(emp)}</option>
            ))}
          </Select>
        </div>
      </div>

      {hasPermission('attendance:read') && (
        <AttendanceReport data={attendance.data?.summary} loading={attendance.isLoading} meta={attendance.data?.meta} onExport={() => onExport('att')} disabled={!attendance.data} />
      )}
      {hasPermission('overtime:read') && (
        <OvertimeReport data={overtimes.data?.summary} loading={overtimes.isLoading} meta={overtimes.data?.meta} onExport={() => onExport('ot')} disabled={!overtimes.data} />
      )}
      {hasPermission('leave:read') && (
        <LeaveReport data={leaves.data?.summary} loading={leaves.isLoading} meta={leaves.data?.meta} onExport={() => onExport('lv')} disabled={!leaves.data} />
      )}
      {hasPermission('attendance:read') && (
        <AttendanceLogReport data={attendanceLog.data?.rows} loading={attendanceLog.isLoading} meta={attendanceLog.data?.meta} onExport={() => onExport('attlog')} disabled={!attendanceLog.data} />
      )}
    </div>
  );
}

function ReportFrame({
  title,
  description,
  onExport,
  disabled,
  children,
}: {
  title: string;
  description: string;
  onExport: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} disabled={disabled}>
          <Download /> Excel
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingRows() {
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Personel</TableHead><TableHead className="text-right">Değer</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}><TableCell><Skeleton className="h-6 w-40" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyRows() {
  return (
    <Table>
      <TableBody>
        <TableRow><TableCell className="text-center text-muted-foreground">Bu aralıkta veri yok</TableCell></TableRow>
      </TableBody>
    </Table>
  );
}

function AttendanceReport({
  data,
  loading,
  meta,
  onExport,
  disabled,
}: {
  data?: AttendanceSummaryRow[];
  loading: boolean;
  meta?: { totalRecords: number; totalWorkedMinutes: number };
  onExport: () => void;
  disabled: boolean;
}) {
  const totalHours = (meta?.totalWorkedMinutes ?? 0) / 60;
  return (
    <ReportFrame
      title="Çalışma Süresi / Puantaj"
      description={meta ? `Toplam ${meta.totalRecords} kayıt · ${totalHours.toFixed(1)} saat çalışma` : 'Gün içi toplamlar'}
      onExport={onExport}
      disabled={disabled}
    >
      {loading ? (
        <LoadingRows />
      ) : data && data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead className="text-right">Giriş</TableHead>
              <TableHead className="text-right">Çıkış</TableHead>
              <TableHead className="text-right">Kayıt</TableHead>
              <TableHead className="text-right">Çalışılan</TableHead>
              <TableHead className="text-right">Gün</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employee.id}>
                <TableCell>{FULL_NAME(row.employee)}</TableCell>
                <TableCell className="text-right">{row.totalIn}</TableCell>
                <TableCell className="text-right">{row.totalOut}</TableCell>
                <TableCell className="text-right">{row.totalRecords}</TableCell>
                <TableCell className="text-right font-medium">{durationLabel(row.workedMinutes)}</TableCell>
                <TableCell className="text-right">{row.days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyRows />
      )}
    </ReportFrame>
  );
}

function OvertimeReport({
  data,
  loading,
  meta,
  onExport,
  disabled,
}: {
  data?: OvertimeSummaryRow[];
  loading: boolean;
  meta?: { totalHours: number; records: number };
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <ReportFrame
      title="Mesai Raporu"
      description={meta ? `Toplam ${meta.totalHours} onaylı saat · ${meta.records} kayıt` : 'Onaylı mesai saatleri'}
      onExport={onExport}
      disabled={disabled}
    >
      {loading ? (
        <LoadingRows />
      ) : data && data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead className="text-right">Onaylı Saat</TableHead>
              <TableHead className="text-right">Toplam Saat</TableHead>
              <TableHead className="text-right">Kayıt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employee.id}>
                <TableCell>{FULL_NAME(row.employee)}</TableCell>
                <TableCell className="text-right font-medium">{row.approvedHours}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.totalHours}</TableCell>
                <TableCell className="text-right">{row.records}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyRows />
      )}
    </ReportFrame>
  );
}

function AttendanceLogReport({
  data,
  loading,
  meta,
  onExport,
  disabled,
}: {
  data?: AttendanceLogRow[];
  loading: boolean;
  meta?: { totalRows: number };
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <ReportFrame
      title="Giriş-Çıkış Günlüğü"
      description={meta ? `Toplam ${meta.totalRows} gün kaydı` : 'Her personel için günde tek satır'}
      onExport={onExport}
      disabled={disabled}
    >
      {loading ? (
        <LoadingRows />
      ) : data && data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead className="w-16">Sicil No</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead className="w-24">Giriş</TableHead>
              <TableHead className="w-24">Çıkış</TableHead>
              <TableHead className="w-24 text-right">Çalışılan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={`${row.employee.id}-${row.date}`}>
                <TableCell className="text-muted-foreground">{row.date}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.employee.employeeNo ?? '—'}</TableCell>
                <TableCell>{FULL_NAME(row.employee)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">{hhmm(row.checkIn?.at)}</span>
                      {row.checkIn?.source && row.checkIn.source !== 'MANUAL' && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{srcLabel(row.checkIn.source)}</Badge>
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-600">{hhmm(row.checkOut?.at)}</span>
                    {row.checkOut?.source && row.checkOut.source !== 'MANUAL' && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{srcLabel(row.checkOut.source)}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{row.worked ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyRows />
      )}
    </ReportFrame>
  );
}

function LeaveReport({
  data,
  loading,
  meta,
  onExport,
  disabled,
}: {
  data?: LeaveSummaryRow[];
  loading: boolean;
  meta?: { totalDays: number; records: number };
  onExport: () => void;
  disabled: boolean;
}) {
  const typeNames = Array.from(new Set((data ?? []).flatMap((r) => Object.keys(r.byType))));
  return (
    <ReportFrame
      title="İzin Raporu"
      description={meta ? `Toplam ${meta.totalDays} onaylı gün · ${meta.records} istek` : 'Durum ve türe göre izinler'}
      onExport={onExport}
      disabled={disabled}
    >
      {loading ? (
        <LoadingRows />
      ) : data && data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead className="text-right">Onaylı</TableHead>
              <TableHead className="text-right">Bekleyen</TableHead>
              <TableHead className="text-right">Toplam</TableHead>
              {typeNames.map((t) => (
                <TableHead key={t} className="text-right">{t}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.employee.id}>
                <TableCell>{FULL_NAME(row.employee)}</TableCell>
                <TableCell className="text-right font-medium">{row.approvedDays}</TableCell>
                <TableCell className="text-right">{row.pendingDays}</TableCell>
                <TableCell className="text-right">{row.totalDays}</TableCell>
                {typeNames.map((t) => (
                  <TableCell key={t} className="text-right text-muted-foreground">{row.byType[t] ?? 0}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyRows />
      )}
    </ReportFrame>
  );
}