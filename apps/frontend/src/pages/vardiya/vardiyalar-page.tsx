import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { orgApi } from '@/features/organizasyon/api';
import { durationLabel, shiftApi, type ShiftItem, type ShiftDay } from '@/features/vardiya/api';
import { employeesApi } from '@/features/personel/api';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/auth';
import { formatError } from '@/lib/utils';

export function VardiyalarPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ShiftItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list({ includeInactive: true }) });

  const createMutation = useMutation({
    mutationFn: async ({ payload, employeeIds }: { payload: Parameters<typeof shiftApi.create>[0]; employeeIds: string[] }) => {
      const shift = await shiftApi.create(payload);
      if (employeeIds.length > 0) {
        const weekdays: ShiftDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
        for (const day of weekdays) {
          await shiftApi.bulkAssign({ shiftId: shift.id, day, employeeIds });
        }
      }
      return shift;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setCreateOpen(false);
      setErrorMessage(null);
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shiftApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setConfirmDelete(null);
    },
    onError: (err) => {
      setConfirmDelete(null);
      setErrorMessage(formatError(err));
    },
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
              <div className="flex items-center gap-1">
                <Badge variant={shift.isActive ? 'success' : 'secondary'}>{shift.isActive ? 'Aktif' : 'Pasif'}</Badge>
                {hasPermission('shift:write') && (
                  <Button variant="ghost" size="icon" title="Sil" onClick={() => setConfirmDelete(shift)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                {durationLabel(shift.startTime, shift.endTime, shift.breakMinutes)} fiili çalışma
              </div>
              <div className="text-muted-foreground">{shift.workLocation?.name ?? 'Konumsuz'}</div>
              <div className="text-muted-foreground">{shift._count?.assignments ?? 0} atama</div>
              {hasPermission('shift:write') && (
                <Link to={`/vardiya/atama/${shift.id}`} className="text-sm font-medium text-primary underline underline-offset-4">
                  Atamaları Yönet →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
        {data && data.length === 0 && (
          <Card><CardContent className="text-muted-foreground">Vardiya tanımlı değil</CardContent></Card>
        )}
      </div>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Vardiyayı sil"
        description={`"${confirmDelete?.name}" vardiyası ve tüm atamaları kalıcı olarak silinecek.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}>
              {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Bu işlem geri alınamaz.</p>
      </Dialog>

      <CreateShiftDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        pending={createMutation.isPending}
        onSubmit={(payload, employeeIds) => createMutation.mutate({ payload, employeeIds })}
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
  onSubmit: (payload: Parameters<typeof shiftApi.create>[0], employeeIds: string[]) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [description, setDescription] = useState('');
  const [workLocationId, setWorkLocationId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  
  const { data: locations } = useQuery({ queryKey: ['work-locations'], queryFn: () => orgApi.list('work-locations', { pageSize: 100 }) });
  const { data: employees } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeesApi.list({ pageSize: 500 }) });

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
    }, selectedEmployeeIds);
    setName('');
    setCode('');
    setBreakMinutes('60');
    setDescription('');
    setWorkLocationId('');
    setSelectedEmployeeIds([]);
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
        
        <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border mt-2">
          <Label className="flex items-center gap-2 mb-2">
            <Users className="size-4" />
            Personel Seçimi <span className="text-muted-foreground text-xs font-normal">(İsteğe bağlı - Sadece hafta içi günleri için otomatik atanır)</span>
          </Label>
          <div className="h-40 overflow-y-auto border border-input rounded-md p-2 space-y-1">
            {employees?.items.length === 0 && <div className="text-sm text-muted-foreground p-2">Personel bulunamadı.</div>}
            {employees?.items.map(emp => (
              <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors">
                <Checkbox 
                  checked={selectedEmployeeIds.includes(emp.id)} 
                  onCheckedChange={() => toggleEmployee(emp.id)} 
                />
                <span className="text-sm">{emp.firstName} {emp.lastName} {emp.employeeNo ? `(${emp.employeeNo})` : ''}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}