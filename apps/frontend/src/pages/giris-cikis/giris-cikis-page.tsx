import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusCircle, QrCode, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { orgApi } from '@/features/organizasyon/api';
import { employeesApi } from '@/features/personel/api';
import {
  attendanceApi,
  formatDateTime,
  PUNCH_SOURCE_LABEL,
  PUNCH_TYPE_LABEL,
  type AttendanceEntry,
  type DailyAttendanceRow,
  type PunchSource,
  type PunchType,
} from '@/features/giris-cikis/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;
const DAILY_PAGE_SIZE = 100;

export function GirisCikisPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [view, setView] = useState<'daily' | 'raw'>('daily');
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyPage, setDailyPage] = useState(1);
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [punchOpen, setPunchOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', type, source, from, to, page],
    enabled: view === 'raw',
    queryFn: () =>
      attendanceApi.list({
        page,
        pageSize: PAGE_SIZE,
        type: (type || undefined) as PunchType | undefined,
        source: (source || undefined) as PunchSource | undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const dailyQuery = useQuery({
    queryKey: ['attendance-daily', dailyDate, dailyPage],
    enabled: view === 'daily',
    queryFn: () => attendanceApi.daily(dailyDate, { page: dailyPage, pageSize: DAILY_PAGE_SIZE }),
  });

  const punchMutation = useMutation({
    mutationFn: (payload: Parameters<typeof attendanceApi.punch>[0]) => attendanceApi.punch(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-summary'] }),
      ]);
      setPunchOpen(false);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { type: PunchType; timestamp: string; locationId?: string }) =>
      attendanceApi.update(editTarget!.id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-summary'] }),
      ]);
      setEditTarget(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Giriş-Çıkış"
        description={`${data?.total ?? 0} zımbadan kayıt`}
        actions={
          <div className="flex gap-2">
            {hasPermission('attendance:write') && (
              <Button variant="outline" onClick={() => setPunchOpen(true)}>
                <PlusCircle /> Manuel Kayıt
              </Button>
            )}
            {hasPermission('qr:read') && (
              <Link to="/giris-cikis/qr" className={buttonVariants()}>
                <QrCode /> QR Kodlar
              </Link>
            )}
          </div>
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          <Button
            variant={view === 'daily' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-md"
            onClick={() => { setView('daily'); setDailyPage(1); }}
          >
            Günlük
          </Button>
          <Button
            variant={view === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-md"
            onClick={() => setView('raw')}
          >
            Tüm Kayıtlar
          </Button>
        </div>

        {view === 'daily' ? (
          <Input
            type="date"
            className="w-40"
            value={dailyDate}
            onChange={(e) => { setDailyDate(e.target.value); setDailyPage(1); }}
          />
        ) : (
          <>
            <Select className="w-40" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Tüm türler</option>
              <option value="IN">Giriş</option>
              <option value="OUT">Çıkış</option>
            </Select>
            <Select className="w-40" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
              <option value="">Tüm kaynaklar</option>
              <option value="QR">QR</option>
              <option value="MANUAL">Manuel</option>
              <option value="PDKS">PDKS</option>
              <option value="CARD">Kart</option>
            </Select>
            <Input type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <span className="text-sm text-muted-foreground">–</span>
            <Input type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </>
        )}
      </div>

      <Card>
        {view === 'daily' ? (
          <DailyTable rows={dailyQuery.data?.items ?? []} isLoading={dailyQuery.isLoading} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Zaman</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead className="w-16 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
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
                  <TableCell>
                    <Badge variant={entry.type === 'IN' ? 'success' : 'secondary'}>
                      {PUNCH_TYPE_LABEL[entry.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PUNCH_SOURCE_LABEL[entry.source]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.location?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {hasPermission('attendance:write') && (
                      <Button variant="ghost" size="icon" title="Düzenle" onClick={() => setEditTarget(entry)}>
                        <Pencil />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Kayıt yok</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {view === 'raw' && data && (
          <div className="p-4">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
        {view === 'daily' && dailyQuery.data && dailyQuery.data.total > DAILY_PAGE_SIZE && (
          <div className="p-4">
            <Pagination
              page={dailyQuery.data.page}
              pageSize={dailyQuery.data.pageSize}
              total={dailyQuery.data.total}
              onPageChange={setDailyPage}
            />
          </div>
        )}
      </Card>

      <ManualPunchDialog
        open={punchOpen}
        onClose={() => setPunchOpen(false)}
        onError={setErrorMessage}
        onSubmit={(payload) => punchMutation.mutate(payload)}
        pending={punchMutation.isPending}
      />

      <EditAttendanceDialog
        entry={editTarget}
        onClose={() => setEditTarget(null)}
        pending={updateMutation.isPending}
        onSubmit={(payload) => updateMutation.mutate(payload)}
      />
    </div>
  );
}

function DailyTable({ rows, isLoading }: { rows: DailyAttendanceRow[]; isLoading: boolean }) {
  const renderPunch = (p?: DailyAttendanceRow['checkIn']) => {
    if (!p) return <span className="text-muted-foreground/50">—</span>;
    return (
      <div className="leading-tight">
        <div className="font-mono text-sm">{new Date(p.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{PUNCH_SOURCE_LABEL[p.source]}</Badge>
          {p.location?.name ? ` · ${p.location.name}` : ''}
        </div>
      </div>
    );
  };

  const workingTime = (r: DailyAttendanceRow) => {
    if (!r.checkIn || !r.checkOut) return null;
    const diff = new Date(r.checkOut.at).getTime() - new Date(r.checkIn.at).getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h} sa ${m} dk`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead className="w-28">Giriş</TableHead>
          <TableHead className="w-28">Çıkış</TableHead>
          <TableHead className="w-24">Çalışılan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
          ))}
        {rows.map((row) => (
          <TableRow key={row.id ?? `${row.employee.id}-${row.day}`}>
            <TableCell>
              <div className="leading-tight">
                <div className="font-medium">
                  {row.employee.firstName} {row.employee.lastName}
                </div>
                {row.employee.employeeNo && (
                  <div className="text-xs text-muted-foreground">{row.employee.employeeNo}</div>
                )}
              </div>
            </TableCell>
            <TableCell>{renderPunch(row.checkIn)}</TableCell>
            <TableCell>{renderPunch(row.checkOut)}</TableCell>
            <TableCell>
              {workingTime(row) ? (
                <Badge variant="secondary">{workingTime(row)}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
        {!isLoading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">Bu güne ait kayıt yok</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ManualPunchDialog({
  open,
  onClose,
  onSubmit,
  pending,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { employeeId: string; type: PunchType; timestamp: string; locationId?: string }) => void;
  pending: boolean;
  onError: (msg: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<PunchType>('IN');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });
  const { data: locations } = useQuery({
    queryKey: ['work-locations'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 100 }),
  });
  const [locationId, setLocationId] = useState('');

  const submit = () => {
    if (!employeeId || !type) return;
    const timestamp = date && time ? `${date}T${time}:00` : undefined;
    if (!timestamp) {
      onError('Tarih ve saat gerekli.');
      return;
    }
    onSubmit({ employeeId, type, timestamp, locationId: locationId || undefined });
    setEmployeeId('');
    setType('IN');
    setDate('');
    setTime('');
    setLocationId('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Manuel Giriş-Çıkış"
      description="Personel ve zaman bilgisi"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!employeeId || pending} onClick={submit}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
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
        <div className="space-y-2">
          <Label>Tür *</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as PunchType)}>
            <option value="IN">Giriş</option>
            <option value="OUT">Çıkış</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tarih *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Saat *</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Görev yeri</Label>
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Seçin…</option>
            {locations?.items.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}

function EditAttendanceDialog({
  entry,
  onClose,
  onSubmit,
  pending,
}: {
  entry: AttendanceEntry | null;
  onClose: () => void;
  onSubmit: (payload: { type: PunchType; timestamp: string; locationId?: string }) => void;
  pending: boolean;
}) {
  const key = entry?.id;
  const { data: locations } = useQuery({
    queryKey: ['work-locations'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 100 }),
  });

  const initial = {
    type: (entry?.type ?? 'IN') as PunchType,
    date: entry?.timestamp ? entry.timestamp.slice(0, 10) : '',
    time: entry?.timestamp ? entry.timestamp.slice(11, 16) : '',
    locationId: entry?.locationId ?? '',
  };

  const [display, setDisplay] = useState(initial);
  const isOpen = !!entry;

  if (key !== undefined) {
    if (display.type !== initial.type || display.date !== initial.date || display.time !== initial.time || display.locationId !== initial.locationId) {
      setDisplay({ type: initial.type, date: initial.date, time: initial.time, locationId: initial.locationId });
    }
  }

  const submit = () => {
    if (!entry) return;
    if (!display.date || !display.time) return;
    const timestamp = `${display.date}T${display.time}:00`;
    onSubmit({ type: display.type, timestamp, locationId: display.locationId || undefined });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      key={key}
      title="Giriş-Çıkış Düzenle"
      description={entry ? `${entry.employee.firstName} ${entry.employee.lastName} — ${formatDateTime(entry.timestamp)}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!entry || pending} onClick={submit}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Tür *</Label>
          <Select value={display.type} onChange={(e) => setDisplay((d) => ({ ...d, type: e.target.value as PunchType }))}>
            <option value="IN">Giriş</option>
            <option value="OUT">Çıkış</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tarih *</Label>
            <Input type="date" value={display.date} onChange={(e) => setDisplay((d) => ({ ...d, date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Saat *</Label>
            <Input type="time" value={display.time} onChange={(e) => setDisplay((d) => ({ ...d, time: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Görev yeri</Label>
          <Select value={display.locationId} onChange={(e) => setDisplay((d) => ({ ...d, locationId: e.target.value }))}>
            <option value="">Seçin…</option>
            {locations?.items.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}