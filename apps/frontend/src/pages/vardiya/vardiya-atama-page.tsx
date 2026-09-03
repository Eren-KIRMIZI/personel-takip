import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { employeesApi } from '@/features/personel/api';
import { SHIFT_DAY_LABEL, SHIFT_DAY_ORDER, shiftApi, type ShiftDay } from '@/features/vardiya/api';
import { formatError } from '@/lib/utils';

export function VardiyaAtamaPage() {
  const { shiftId = '' } = useParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: shift } = useQuery({ queryKey: ['shift', shiftId], queryFn: () => shiftApi.list().then((s) => s.find((x) => x.id === shiftId)) });
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['shift-assignments', shiftId],
    queryFn: () => shiftApi.assignments(shiftId ? { shiftId } : undefined),
    enabled: !!shiftId,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shift-assignments', shiftId] }),
      queryClient.invalidateQueries({ queryKey: ['shifts'] }),
    ]);
  };

  const assignMutation = useMutation({
    mutationFn: (payload: { day: ShiftDay; employeeIds: string[] }) => shiftApi.assign({ shiftId, ...payload }),
    onSuccess: async () => {
      await invalidate();
      setAssignOpen(false);
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => shiftApi.removeAssignment(id),
    onSuccess: async () => invalidate(),
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const byDay = SHIFT_DAY_ORDER.map((day) => ({
    day,
    rows: assignments?.filter((a) => a.day === day) ?? [],
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={shift ? `${shift.name} — Atamalar` : 'Atamalar'}
        description="Günlere göre personel vardiyaları"
        actions={
          <div className="flex gap-2">
            <Link to="/vardiya" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft /> Vardiyalar
            </Link>
            <Button onClick={() => setAssignOpen(true)}>
              <UserPlus /> Atama Yap
            </Button>
          </div>
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gün</TableHead>
                <TableHead>Personel</TableHead>
                <TableHead>Vardiya</TableHead>
                <TableHead className="w-16 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
              {byDay.flatMap(({ day, rows }) =>
                rows.length > 0
                  ? rows.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell><Badge variant="outline">{SHIFT_DAY_LABEL[day]}</Badge></TableCell>
                        <TableCell>
                          {a.employee.firstName} {a.employee.lastName}
                          {a.employee.employeeNo ? ` (${a.employee.employeeNo})` : ''}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.shift.name} · {a.shift.startTime}–{a.shift.endTime}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Kaldır" onClick={() => removeMutation.mutate(a.id)}>
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  : [],
              )}
              {!isLoading && assignments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Bu vardiya için atama yok. "Atama Yap" ile başlayın.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Toplam atama sayısı */}
          {assignments && (
            <div className="mt-3 text-sm text-muted-foreground">
              Toplam {assignments.length} atama ·{' '}
              {SHIFT_DAY_ORDER.filter((d) => byDay.find((b) => b.day === d && b.rows.length)?.rows).length} gün planlı
            </div>
          )}
        </CardContent>
      </Card>

      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        pending={assignMutation.isPending}
        onSubmit={(payload) => assignMutation.mutate(payload)}
      />
    </div>
  );
}

function AssignDialog({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { day: ShiftDay; employeeIds: string[] }) => void;
  pending: boolean;
}) {
  const { shiftId = '' } = useParams();
  const [day, setDay] = useState<ShiftDay>('MON');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const { data: employees } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeesApi.list({ pageSize: 500 }) });
  const { data: shift } = useQuery({ queryKey: ['shift', shiftId], queryFn: () => shiftApi.list().then((s) => s.find((x) => x.id === shiftId)) });

  const assignedIds = useQuery({
    queryKey: ['shift-assignments', shiftId],
    queryFn: () => shiftApi.assignments({ shiftId }),
  });

  const submit = () => {
    if (!employeeIds.length) return;
    onSubmit({ day, employeeIds });
    setEmployeeIds([]);
  };

  const toggle = (id: string) => {
    setEmployeeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vardiya Ataması"
      description={`${shift?.name ?? 'Vardiya'} — gün ve personeller`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!employeeIds.length || pending} onClick={submit}>
            {pending ? 'Atanıyor…' : `${employeeIds.length} personel ata`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Gün *</Label>
          <Select value={day} onChange={(e) => setDay(e.target.value as ShiftDay)}>
            {SHIFT_DAY_ORDER.map((d) => (
              <option key={d} value={d}>{SHIFT_DAY_LABEL[d]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Seçili günde zaten atananlar gizlenir</Label>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {employees?.items.map((emp) => {
              const already = assignedIds.data?.some((a) => a.employeeId === emp.id && a.day === day);
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${already ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={!already && employeeIds.includes(emp.id)}
                    disabled={already}
                    onChange={() => toggle(emp.id)}
                  />
                  {emp.firstName} {emp.lastName}
                  {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                  {already ? ' · ekli' : ''}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}