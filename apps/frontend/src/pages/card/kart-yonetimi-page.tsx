import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth';
import { cardApi } from '@/features/card/api';
import { employeesApi } from '@/features/personel/api';
import { orgApi } from '@/features/organizasyon/api';
import { formatError } from '@/lib/utils';
import { CreditCard, KeyRound, MapPin } from 'lucide-react';

export function KartYonetimiPage() {
  const queryClient = useQueryClient();
  const hasWrite = useAuthStore((s) => s.hasPermission('attendance:write'));

  const { data, isLoading } = useQuery({
    queryKey: ['card-credentials'],
    queryFn: () => cardApi.credentials({ pageSize: 100 }),
    staleTime: 60 * 1000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'card-assign'],
    queryFn: () => employeesApi.list({ pageSize: 200, status: 'ACTIVE' }),
    enabled: hasWrite,
    staleTime: 5 * 60 * 1000,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['work-locations-all'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 200 }),
    enabled: hasWrite,
    staleTime: 5 * 60 * 1000,
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardUidValid = /^\d{15}$/.test(cardUid.trim());

  const create = useMutation({
    mutationFn: () =>
      cardApi.createCredential({
        employeeId,
        cardUid: cardUid.trim(),
        locationIds: selectedLocations.length ? selectedLocations : undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      setAssignOpen(false);
      setEmployeeId('');
      setCardUid('');
      setSelectedLocations([]);
      setNote('');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['card-credentials'] });
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      cardApi.updateCredential(id, { isActive: !isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-credentials'] });
    },
  });

  const employees = employeesData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Kart Yönetimi</h1>
          <p className="text-sm text-muted-foreground">Personel → Kart eşleştirmesi</p>
        </div>
        <div className="flex items-center gap-2">
          {hasWrite && (
            <Link to="/pdks-simulator" className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
              <CreditCard className="size-4" /> Simülatör
            </Link>
          )}
          {hasWrite && (
            <Button onClick={() => setAssignOpen(true)}>
              <KeyRound className="mr-2" /> Kart Tanımla
            </Button>
          )}
        </div>
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
                  <TableHead>Personel</TableHead>
                  <TableHead>Kart ID</TableHead>
                  <TableHead>Geçerli Lokasyonlar</TableHead>
                  <TableHead>Not</TableHead>
                  <TableHead>Durum</TableHead>
                  {hasWrite && <TableHead className="text-right">Aksiyon</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/personel/${c.employee.id}`} className="font-medium hover:underline">
                        {c.employee.firstName} {c.employee.lastName}
                      </Link>
                      <div className="text-xs text-muted-foreground">Sicil: {c.employee.employeeNo ?? '-'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.cardUid}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.locations?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {c.locations.map((l) => (
                            <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                              <MapPin className="size-3" /> {l.location.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">Her yerde geçerli</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.note ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    {hasWrite && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: c.id, isActive: c.isActive })}
                        >
                          {c.isActive ? 'Devre Dışı' : 'Aktif Et'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Henüz kart tanımlanmamış. Kart Tanımla ile başlayın.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Kart Tanımla"
        description="Personele yeni bir kart ID tanımlayın."
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Vazgeç</Button>
            <Button disabled={!employeeId || !cardUidValid || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        {errorMessage && <p className="mb-3 text-sm text-destructive">{errorMessage}</p>}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Personel</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm text-foreground"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="" disabled>Personel seçin…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} {e.employeeNo ? `(${e.employeeNo})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Kart ID</Label>
            <Input
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="15 haneli kart numarası"
              maxLength={15}
              inputMode="numeric"
            />
            {cardUid && !cardUidValid && (
              <p className="text-xs text-destructive">Kart ID tam 15 haneli rakam olmalıdır.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Geçerli Lokasyonlar (opsiyonel)</Label>
            <p className="text-xs text-muted-foreground">
              Boş bırakılırsa kart her yerde geçerli olur.
            </p>
            {locationsData?.items.map((loc) => (
              <label key={loc.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={selectedLocations.includes(loc.id)}
                  onChange={(e) =>
                    setSelectedLocations((prev) =>
                      e.target.checked ? [...prev, loc.id] : prev.filter((id) => id !== loc.id),
                    )
                  }
                />
                <MapPin className="size-3.5 text-muted-foreground" />
                {loc.name}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Not (opsiyonel)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Bordo kart" />
          </div>
        </div>
      </Dialog>
    </div>
  );
}