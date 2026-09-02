import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { orgApi } from '@/features/organizasyon/api';
import { durationLabel, shiftApi } from '@/features/vardiya/api';
import { formatError } from '@/lib/utils';

export function VardiyalarPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list({ includeInactive: true }) });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof shiftApi.create>[0]) => shiftApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setCreateOpen(false);
      setErrorMessage(null);
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vardiyalar"
        description={`${data?.length ?? 0} vardiya tanımı`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Yeni Vardiya
          </Button>
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-32"><CardContent /></Card>)}
        {data?.map((shift) => (
          <Card key={shift.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{shift.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {shift.startTime} – {shift.endTime}
                  {shift.breakMinutes > 0 ? ` · ${shift.breakMinutes}dk mola` : ''}
                </p>
              </div>
              <Badge variant={shift.isActive ? 'success' : 'secondary'}>{shift.isActive ? 'Aktif' : 'Pasif'}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                {durationLabel(shift.startTime, shift.endTime, shift.breakMinutes)} fiili çalışma
              </div>
              <div className="text-muted-foreground">{shift.workLocation?.name ?? 'Konumsuz'}</div>
              <div className="text-muted-foreground">{shift._count?.assignments ?? 0} atama</div>
              <Link to={`/vardiya/atama/${shift.id}`} className="text-sm font-medium text-primary underline underline-offset-4">
                Atamaları Yönet →
              </Link>
            </CardContent>
          </Card>
        ))}
        {data && data.length === 0 && (
          <Card><CardContent className="text-muted-foreground">Vardiya tanımlı değil</CardContent></Card>
        )}
      </div>

      <CreateShiftDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        pending={createMutation.isPending}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </div>
  );
}

function CreateShiftDialog({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Parameters<typeof shiftApi.create>[0]) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [description, setDescription] = useState('');
  const [workLocationId, setWorkLocationId] = useState('');
  const { data: locations } = useQuery({ queryKey: ['work-locations'], queryFn: () => orgApi.list('work-locations', { pageSize: 100 }) });

  const submit = () => {
    if (!name || !startTime || !endTime) return;
    onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      startTime,
      endTime,
      breakMinutes: Number(breakMinutes) || 0,
      description: description.trim() || undefined,
      workLocationId: workLocationId || undefined,
    });
    setName('');
    setCode('');
    setBreakMinutes('60');
    setDescription('');
    setWorkLocationId('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yeni Vardiya"
      description="Çalışma saatleri tanımlayın"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!name || !startTime || !endTime || pending} onClick={submit}>
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ad *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Gündüz" />
        </div>
        <div className="space-y-2">
          <Label>Kod</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="örn. GUNDUZ" />
        </div>
        <div className="space-y-2">
          <Label>Başlangıç *</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bitiş *</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mola (dk)</Label>
          <Input type="number" min="0" step="5" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Görev yeri</Label>
          <Select value={workLocationId} onChange={(e) => setWorkLocationId(e.target.value)}>
            <option value="">Yok</option>
            {locations?.items.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Açıklama</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </Dialog>
  );
}