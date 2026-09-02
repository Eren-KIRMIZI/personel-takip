import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusCircle, QrCode } from 'lucide-react';
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
  type PunchSource,
  type PunchType,
} from '@/features/giris-cikis/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;

export function GirisCikisPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [punchOpen, setPunchOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', type, source, from, to, page],
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
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <span className="text-sm text-muted-foreground">–</span>
        <Input type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Zaman</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Konum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
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
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Kayıt yok</TableCell>
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

      <ManualPunchDialog
        open={punchOpen}
        onClose={() => setPunchOpen(false)}
        onError={setErrorMessage}
        onSubmit={(payload) => punchMutation.mutate(payload)}
        pending={punchMutation.isPending}
      />
    </div>
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