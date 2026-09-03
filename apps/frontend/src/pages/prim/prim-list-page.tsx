import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { bonusApi, BONUS_STATUS_META, type Bonus } from '@/features/prim/api';
import { employeesApi, FULL_NAME } from '@/features/personel/api';
import { formatError, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

export function PrimListPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bonus | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bonus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bonuses'],
    queryFn: () => bonusApi.list({ pageSize: 100 }),
  });
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bonuses'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => bonusApi.updateStatus(id, { status: 'APPROVED' }),
    onSuccess: async () => invalidate(),
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => bonusApi.updateStatus(id, { status: 'REJECTED' }),
    onSuccess: async () => invalidate(),
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bonusApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      setDeleteTarget(null);
      setErrorMessage(formatError(err));
    },
  });

  return (
    <div className="space-y-4">
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      <PageHeader 
        title="Prim Yönetimi" 
        description="Personel prim ve ikramiye girişleri"
        actions={
          hasPermission('bonus:write') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Yeni Prim Ekle
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Personel</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="w-28 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Kayıt bulunamadı</TableCell>
                </TableRow>
              ) : (
                data?.items.map((bonus) => {
                  const meta = BONUS_STATUS_META[bonus.status];
                  return (
                    <TableRow key={bonus.id}>
                      <TableCell className="whitespace-nowrap">{new Date(bonus.date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="font-medium">{FULL_NAME(bonus.employee)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(bonus.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                        {bonus.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {bonus.status === 'PENDING' && hasPermission('bonus:approve') && (
                            <Button variant="outline" size="icon" title="Onayla" onClick={() => approveMutation.mutate(bonus.id)}>
                              <Check />
                            </Button>
                          )}
                          {bonus.status === 'PENDING' && hasPermission('bonus:approve') && (
                            <Button variant="outline" size="icon" title="Reddet" onClick={() => rejectMutation.mutate(bonus.id)}>
                              <X />
                            </Button>
                          )}
                          {hasPermission('bonus:write') && (
                            <Button variant="outline" size="icon" title="Düzenle" onClick={() => setEditTarget(bonus)}>
                              <Pencil />
                            </Button>
                          )}
                          {hasPermission('bonus:write') && (
                            <Button variant="outline" size="icon" title="Sil" onClick={() => setDeleteTarget(bonus)}>
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateBonusDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <EditBonusDialog
        bonus={editTarget}
        onClose={() => setEditTarget(null)}
        onError={setErrorMessage}
        onSaved={() => invalidate()}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Primi sil"
        description={deleteTarget ? `${FULL_NAME(deleteTarget.employee)} — ${formatCurrency(deleteTarget.amount)} prim kaydı silinecek.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Bu işlem geri alınamaz.</p>
      </Dialog>
    </div>
  );
}

function CreateBonusDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: employees } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeesApi.list({ pageSize: 500 }) });

  const mut = useMutation({
    mutationFn: bonusApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      setEmployeeId(''); setAmount(''); setDescription(''); setErrorMsg('');
      onClose();
    },
    onError: (err) => setErrorMsg(formatError(err)),
  });

  const submit = () => {
    if (!employeeId || !amount || !date) return;
    mut.mutate({ employeeId, amount: Number(amount), date, description: description || undefined });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yeni Prim / İkramiye"
      description="Personele verilecek primi girin"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button disabled={mut.isPending || !employeeId || !amount || !date} onClick={submit}>
            {mut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        
        <div className="space-y-2">
          <Label>Personel</Label>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Seçiniz</option>
            {employees?.items.map((emp) => (
              <option key={emp.id} value={emp.id}>{FULL_NAME(emp)}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tutar (₺)</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Tarih</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Açıklama (İsteğe bağlı)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bayram ikramiyesi vb." />
        </div>
      </div>
    </Dialog>
  );
}

function EditBonusDialog({
  bonus,
  onClose,
  onError,
  onSaved,
}: {
  bonus: Bonus | null;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (bonus) {
      setAmount(String(bonus.amount));
      setDate(bonus.date.slice(0, 10));
      setDescription(bonus.description ?? '');
    }
  }, [bonus]);

  const mut = useMutation({
    mutationFn: (id: string) =>
      bonusApi.update(id, {
        amount: Number(amount),
        date,
        description: description || undefined,
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => onError(formatError(err)),
  });

  const submit = () => {
    if (!bonus) return;
    mut.mutate(bonus.id);
  };

  return (
    <Dialog
      open={bonus !== null}
      onClose={onClose}
      title="Primi Düzenle"
      description={bonus ? `${FULL_NAME(bonus.employee)} — ${formatCurrency(bonus.amount)}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button disabled={mut.isPending || !date} onClick={submit}>
            {mut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Tutar (₺)</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tarih</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Açıklama (İsteğe bağlı)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </Dialog>
  );
}
