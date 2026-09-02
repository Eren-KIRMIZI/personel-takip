import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, EyeOff, ScanLine, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
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
import { attendanceApi, type QrCodeItem } from '@/features/giris-cikis/api';
import { formatError } from '@/lib/utils';

export function QrKodlarPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<QrCodeItem | null>(null);
  const [scanTarget, setScanTarget] = useState<QrCodeItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: () => attendanceApi.qrCodes(),
  });

  const { data: qrImage } = useQuery({
    queryKey: ['qr-image', viewTarget?.id],
    queryFn: () => attendanceApi.qrImage(viewTarget!.id),
    enabled: viewTarget !== null,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
      queryClient.invalidateQueries({ queryKey: ['attendance'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: { locationId: string; entryPointName?: string }) => attendanceApi.createQr(payload),
    onSuccess: async () => {
      await invalidate();
      setCreateOpen(false);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const scanMutation = useMutation({
    mutationFn: (payload: { content: string; employeeId: string }) => attendanceApi.scan(payload.content, payload.employeeId),
    onSuccess: async () => {
      await invalidate();
      setScanTarget(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="QR Kodlar"
        description="Giriş-çıkış noktaları"
        actions={
          <div className="flex gap-2">
            <Link to="/giris-cikis" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft /> Geri
            </Link>
            {hasPermission('qr:write') && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Yeni QR
              </Button>
            )}
          </div>
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Konum</TableHead>
              <TableHead>Giriş Noktası</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead className="w-40 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((qr) => (
              <TableRow key={qr.id}>
                <TableCell>
                  <div className="font-medium">{qr.location.name}</div>
                  {qr.location.address && <div className="text-xs text-muted-foreground">{qr.location.address}</div>}
                </TableCell>
                <TableCell>{qr.entryPointName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={qr.isActive ? 'success' : 'secondary'}>{qr.isActive ? 'Aktif' : 'Pasif'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {qr.expiresAt ? new Date(qr.expiresAt).toLocaleString('tr-TR') : 'Süresiz'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => setViewTarget(qr)}>
                      <Eye /> Göster
                    </Button>
                    {hasPermission('attendance:write') && (
                      <Button variant="outline" size="sm" onClick={() => setScanTarget(qr)}>
                        <ScanLine /> Okut
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">QR kodu yok</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateQrDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        pending={createMutation.isPending}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <Dialog
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title="QR Kodu"
        description={viewTarget ? `${viewTarget.location.name} — ${viewTarget.entryPointName ?? '(noktasız)'}` : undefined}
      >
        <div className="flex flex-col items-center gap-3">
          {qrImage ? (
            <img src={qrImage.dataUrl} alt="QR" className="h-48 w-48 border" />
          ) : (
            <Skeleton className="h-48 w-48" />
          )}
          <div className="flex w-full items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1 text-xs">{viewTarget?.token}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewTarget) {
                  void navigator.clipboard.writeText(viewTarget.token);
                  setErrorMessage(null);
                }
              }}
            >
              <Copy /> Kopyala
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Kodu yazdırıp giriş noktasına asabilirsiniz; çalışanlar telefonuyla okutur.
          </p>
        </div>
      </Dialog>

      <ScanDialog qr={scanTarget} onClose={() => setScanTarget(null)} pending={scanMutation.isPending} onSubmit={(payload) => scanMutation.mutate(payload)} />
    </div>
  );
}

function CreateQrDialog({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { locationId: string; entryPointName?: string }) => void;
  pending: boolean;
}) {
  const [locationId, setLocationId] = useState('');
  const [entryPointName, setEntryPointName] = useState('');
  const { data: locations } = useQuery({
    queryKey: ['work-locations'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 100 }),
  });

  const submit = () => {
    if (!locationId) return;
    onSubmit({ locationId, entryPointName: entryPointName.trim() || undefined });
    setLocationId('');
    setEntryPointName('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yeni QR Kodu"
      description="Bir giriş noktası için QR üretir"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!locationId || pending} onClick={submit}>
            {pending ? 'Üretiliyor…' : 'Üret'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Görev yeri *</Label>
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Seçin…</option>
            {locations?.items.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Giriş noktası adı</Label>
          <Input value={entryPointName} onChange={(e) => setEntryPointName(e.target.value)} placeholder="örn. Ana Giriş" />
        </div>
      </div>
    </Dialog>
  );
}

function ScanDialog({
  qr,
  onClose,
  onSubmit,
  pending,
}: {
  qr: QrCodeItem | null;
  onClose: () => void;
  onSubmit: (payload: { content: string; employeeId: string }) => void;
  pending: boolean;
}) {
  const [content, setContent] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showContent, setShowContent] = useState(false);
  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const submit = () => {
    if (!content.trim() || !employeeId) return;
    onSubmit({ content: content.trim(), employeeId });
  };

  return (
    <Dialog
      open={qr !== null}
      onClose={() => {
        setContent('');
        onClose();
      }}
      title="QR ile giriş-çıkış"
      description={qr ? `${qr.location.name} — ${qr.entryPointName ?? '(noktasız)'}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!content.trim() || !employeeId || pending} onClick={submit}>
            {pending ? 'İşleniyor…' : 'Harekete Geçir'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>QR içeriği (token)</Label>
          <div className="relative">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={qr ? `qr_… (${qr.token.slice(0, 12)}…)` : 'QR token'}
              type={showContent ? 'text' : 'password'}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowContent((v) => !v)}
            >
              {showContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {qr && (
            <textarea
              className="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono outline-none"
              value={qr.token}
              readOnly
            />
          )}
        </div>
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
        <p className="text-xs text-muted-foreground">
          Personelin son hareketi <b>Giriş</b> ise Çıkış, aksi halde Giriş yazılır.
        </p>
      </div>
    </Dialog>
  );
}