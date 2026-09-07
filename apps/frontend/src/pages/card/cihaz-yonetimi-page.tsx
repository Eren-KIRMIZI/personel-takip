import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { cardApi } from '@/features/card/api';
import { orgApi } from '@/features/organizasyon/api';
import { formatError } from '@/lib/utils';
import { Radio } from 'lucide-react';

export function CihazYonetimiPage() {
  const queryClient = useQueryClient();
  const hasWrite = useAuthStore((s) => s.hasPermission('attendance:write'));

  const { data, isLoading } = useQuery({
    queryKey: ['card-readers'],
    queryFn: () => cardApi.readers({ pageSize: 100 }),
    staleTime: 60 * 1000,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['work-locations'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 200 }),
    enabled: hasWrite,
    staleTime: 5 * 60 * 1000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [locationId, setLocationId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      cardApi.createReader({
        name: name.trim(),
        serialNo: serialNo.trim() || undefined,
        locationId: locationId || undefined,
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setName('');
      setSerialNo('');
      setLocationId('');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['card-readers'] });
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      cardApi.updateReader(id, { isActive: !isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-readers'] });
    },
  });

  const locations = locationsData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">PDKS Cihazları</h1>
          <p className="text-sm text-muted-foreground">
            Kart okuyucu cihazlar. Gerçek cihaz geldiğinde burada tanımlanır; kart okutma bu cihazın
            lokasyonunu kullanır.
          </p>
        </div>
        {hasWrite && <Button onClick={() => setCreateOpen(true)}><Radio className="mr-2" /> Cihaz Ekle</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Table>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell><Skeleton className="h-7 w-full" /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : data && data.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cihaz</TableHead>
                  <TableHead>Seri No</TableHead>
                  <TableHead>Lokasyon</TableHead>
                  <TableHead>Durum</TableHead>
                  {hasWrite && <TableHead className="text-right">Aksiyon</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.serialNo ?? '-'}</TableCell>
                    <TableCell>{r.location?.name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'success' : 'secondary'}>
                        {r.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    {hasWrite && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: r.id, isActive: r.isActive })}
                        >
                          {r.isActive ? 'Devre Dışı' : 'Aktif Et'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Henüz cihaz tanımlanmamış. Cihaz Ekle ile başlayın.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Cihaz Ekle"
        description="Yeni kart okuyucu cihazı tanımlayın."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        {errorMessage && <p className="mb-3 text-sm text-destructive">{errorMessage}</p>}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Cihaz Adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Giriş Kapısı - Cihaz 01" />
          </div>
          <div className="space-y-2">
            <Label>Seri No (opsiyonel)</Label>
            <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} placeholder="SN-0001" />
          </div>
          <div className="space-y-2">
            <Label>Lokasyon (opsiyonel)</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm text-foreground"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Lokasyon seçin…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}