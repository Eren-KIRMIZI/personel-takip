import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, Plus, Printer, RefreshCw } from 'lucide-react';
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
import { attendanceApi, type QrCodeItem } from '@/features/giris-cikis/api';
import { formatError } from '@/lib/utils';

export function QrKodlarPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<QrCodeItem | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['attendance-daily'] }),
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

  const rotateMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.rotateQr(id),
    onMutate: (id) => setRotatingId(id),
    onSuccess: async (newQr) => {
      await invalidate();
      setRotatingId(null);
      setErrorMessage(null);
      // Yeni QR'ı hemen görüntüle
      setViewTarget(newQr);
    },
    onError: (error) => {
      setRotatingId(null);
      setErrorMessage(formatError(error));
    },
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
                    {hasPermission('qr:write') && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={rotatingId === qr.id}
                        onClick={() => rotateMutation.mutate(qr.id)}
                        title="QR'ı yenile (yeni token üretir)"
                      >
                        <RefreshCw className={rotatingId === qr.id ? 'animate-spin' : ''} />
                        {rotatingId === qr.id ? 'Yenileniyor…' : 'Yenile'}
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
        <div className="flex flex-col items-center gap-4">
          {qrImage ? (
            <img
              id="qr-print-img"
              src={qrImage.dataUrl}
              alt="QR"
              className="h-52 w-52 rounded-lg border shadow-sm"
            />
          ) : (
            <Skeleton className="h-52 w-52" />
          )}
          {viewTarget && (
            <div className="text-center">
              <p className="text-sm font-medium">{viewTarget.location.name}</p>
              {viewTarget.entryPointName && (
                <p className="text-xs text-muted-foreground">{viewTarget.entryPointName}</p>
              )}
            </div>
          )}
          <div className="flex w-full items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1 text-xs">{viewTarget?.token}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewTarget) void navigator.clipboard.writeText(viewTarget.token);
              }}
            >
              <Copy /> Kopyala
            </Button>
          </div>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (!qrImage) return;
                const w = window.open('', '_blank')!;
                w.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0">`
                  + `<div style="text-align:center"><img src="${qrImage.dataUrl}" style="width:300px;height:300px" />`
                  + `<p style="font-size:14px;margin-top:12px">${viewTarget?.location.name ?? ''}</p>`
                  + `<p style="font-size:12px;color:#666">${viewTarget?.entryPointName ?? ''}</p></div></body></html>`);
                w.document.close();
                w.focus();
                w.print();
              }}
            >
              <Printer className="mr-2 h-4 w-4" /> Yazdır
            </Button>
            {hasPermission('qr:write') && viewTarget && (
              <Button
                variant="destructive"
                className="flex-1"
                disabled={rotatingId === viewTarget.id}
                onClick={() => {
                  if (viewTarget) rotateMutation.mutate(viewTarget.id);
                }}
              >
                <RefreshCw className={rotatingId === viewTarget.id ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                {rotatingId === viewTarget.id ? 'Yenileniyor…' : 'QR Yenile'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            QR'ı yazdırıp giriş noktasına asabilirsiniz. Personel telefonuyla okutarak giriş-çıkış kaydeder.
          </p>
        </div>
      </Dialog>
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
