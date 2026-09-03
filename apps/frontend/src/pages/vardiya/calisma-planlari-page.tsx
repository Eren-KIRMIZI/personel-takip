import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { employeesApi, FULL_NAME, type Employee } from '@/features/personel/api';
import { shiftApi, SHIFT_DAY_ORDER, SHIFT_DAY_LABEL, type ShiftDay, type ShiftAssignment } from '@/features/vardiya/api';
import { useAuthStore } from '@/stores/auth';
import { formatError } from '@/lib/utils';
import { User, Plus, Search } from 'lucide-react';

export function CalismaPlanlariPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  
  const [selectedCell, setSelectedCell] = useState<{ employee: Employee; day: ShiftDay; assignment?: ShiftAssignment } | null>(null);
  const [search, setSearch] = useState('');

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list({ pageSize: 200 }),
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['shift-assignments'],
    queryFn: () => shiftApi.assignments(),
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.list({ includeInactive: false }),
  });

  const isLoading = loadingEmployees || loadingAssignments;

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees?.items ?? [];
    return (employees?.items ?? []).filter((emp) =>
      `${emp.firstName} ${emp.lastName} ${emp.employeeNo ?? ''}`.toLowerCase().includes(q),
    );
  }, [employees, search]);

  // Helper to find assignment for a specific employee and day
  const getAssignment = (empId: string, day: ShiftDay) => {
    return assignments?.find(a => a.employeeId === empId && a.day === day);
  };

  const handleCellClick = (employee: Employee, day: ShiftDay) => {
    if (!hasPermission('shift:write')) return;
    const assignment = getAssignment(employee.id, day);
    setSelectedCell({ employee, day, assignment });
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Haftalık Çalışma Planları" 
        description="Personellerin haftalık vardiya çizelgesi"
      />

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Personel ara (ad, soyad, sicil)…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px] sticky left-0 bg-background z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">Personel</TableHead>
                {SHIFT_DAY_ORDER.map(day => (
                  <TableHead key={day} className="text-center min-w-[120px]">
                    {SHIFT_DAY_LABEL[day]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-5 w-40" /></TableCell>
                    {SHIFT_DAY_ORDER.map(day => (
                      <TableCell key={day}><Skeleton className="h-8 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    {search.trim() ? 'Arama kriterine uyan personel bulunamadı' : 'Personel bulunamadı'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="group">
                    <TableCell className="font-medium sticky left-0 bg-background z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] group-hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{FULL_NAME(emp)}</span>
                      </div>
                    </TableCell>
                    {SHIFT_DAY_ORDER.map(day => {
                      const assignment = getAssignment(emp.id, day);
                      return (
                        <TableCell 
                          key={day} 
                          className="p-1 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleCellClick(emp as Employee, day)}
                        >
                          <div className="h-full w-full flex items-center justify-center min-h-[40px] border border-transparent hover:border-border rounded-md">
                            {assignment ? (
                              <Badge variant="outline" className="bg-primary/5 hover:bg-primary/10 text-xs w-full justify-center">
                                {assignment.shift.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/30 flex flex-col items-center gap-1">
                                <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCell && (
        <AssignShiftDialog 
          open={true} 
          onClose={() => setSelectedCell(null)} 
          data={selectedCell}
          shifts={shifts ?? []}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['shift-assignments'] })}
        />
      )}
    </div>
  );
}

function AssignShiftDialog({ 
  open, 
  onClose, 
  data, 
  shifts,
  onSuccess 
}: { 
  open: boolean; 
  onClose: () => void; 
  data: { employee: Employee; day: ShiftDay; assignment?: ShiftAssignment };
  shifts: any[];
  onSuccess: () => void;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState(data.assignment?.shiftId || '');
  const [errorMsg, setErrorMsg] = useState('');

  const assignMut = useMutation({
    mutationFn: shiftApi.assign,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setErrorMsg(formatError(err)),
  });

  const removeMut = useMutation({
    mutationFn: shiftApi.removeAssignment,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setErrorMsg(formatError(err)),
  });

  const handleSave = () => {
    if (!selectedShiftId) {
      if (data.assignment) {
        removeMut.mutate(data.assignment.id);
      } else {
        onClose();
      }
      return;
    }

    if (data.assignment && data.assignment.shiftId === selectedShiftId) {
      onClose(); // No change
      return;
    }

    assignMut.mutate({ shiftId: selectedShiftId, day: data.day, employeeIds: [data.employee.id] });
  };

  const isPending = assignMut.isPending || removeMut.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${SHIFT_DAY_LABEL[data.day]} Vardiyası`}
      description={`${FULL_NAME(data.employee)} için vardiya seçin`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>İptal</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        
        <div className="space-y-2">
          <Label>Vardiya Seçimi</Label>
          <Select value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value)} disabled={isPending}>
            <option value="">İzinli / Boş</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}
