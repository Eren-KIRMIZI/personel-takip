import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import {
  employeeRecordApi,
  RECORD_CATEGORY_LABELS,
  RECORD_TYPE_LABELS,
  type EmployeeRecordCategory,
  type EmployeeRecordType,
  type EmployeeRecord,
} from '@/features/personel-kayitlari/api';
import { employeesApi } from '@/features/personel/api';
import { formatError } from '@/lib/utils';

const PAGE_SIZE = 15;
const NOW = new Date();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => NOW.getFullYear() - i);

const CATEGORY_OPTIONS: EmployeeRecordCategory[] = ['DISCIPLINARY', 'REWARD'];

function categoryTypes(cat: EmployeeRecordCategory): EmployeeRecordType[] {
  return cat === 'DISCIPLINARY'
    ? ['WARNING', 'REPRIMAND', 'SUSPENSION', 'DEDUCTION', 'TERMINATION']
    : ['PRAISE', 'AWARD', 'CERTIFICATE'];
}

export function CzaOdulPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [activeCategory, setActiveCategory] = useState<EmployeeRecordCategory>('DISCIPLINARY');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Disiplin ve Teşvik"
        description="Personel disiplin ve ödül kayıtları"
      />
      <Tabs
        tabs={CATEGORY_OPTIONS.map((cat) => ({
          value: cat,
          label: RECORD_CATEGORY_LABELS[cat].label,
          content: (
            <CzaOdulTab
              category={cat}
              hasWrite={hasPermission('employee-record:write')}
              hasDelete={hasPermission('employee-record:delete')}
            />
          ),
        }))}
        defaultValue={activeCategory}
        onValueChange={(v) => setActiveCategory(v as EmployeeRecordCategory)}
      />
    </div>
  );
}

function CzaOdulTab({
  category,
  hasWrite,
  hasDelete,
}: {
  category: EmployeeRecordCategory;
  hasWrite: boolean;
  hasDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [year, setYear] = useState(NOW.getFullYear());
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const types = categoryTypes(category);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-records', category, typeFilter, year, page],
    queryFn: () =>
      employeeRecordApi.list({
        page,
        pageSize: PAGE_SIZE,
        category,
        type: (typeFilter || undefined) as EmployeeRecordType | undefined,
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['employee-records'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeRecordApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => {
      setErrorMessage(formatError(error));
      setDeleteTarget(null);
    },
  });

  const catMeta = RECORD_CATEGORY_LABELS[category];

  return (
    <div className="space-y-4">
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Yıl</label>
          <Select className="w-28" value={String(year)} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tür</label>
          <Select className="w-48" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">Tümü</option>
            {types.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
          </Select>
        </div>
        {hasWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Yeni {catMeta.label}
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : data && data.items.length ? (
              data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                    {r.employee.employeeNo && <div className="text-xs text-muted-foreground">{r.employee.employeeNo}</div>}
                  </TableCell>
                  <TableCell><Badge variant={catMeta.color as 'destructive' | 'success'}>{RECORD_TYPE_LABELS[r.type]}</Badge></TableCell>
                  <TableCell className="max-w-56 truncate">{r.title}</TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasWrite && (
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(r)} title="Düzenle">
                          <Pencil className="size-3" />
                        </Button>
                      )}
                      {hasDelete && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} title="Sil">
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {year} yılı için {catMeta.label.toLowerCase()} kaydı yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && <Pagination total={data.total} page={data.page} pageSize={PAGE_SIZE} onPageChange={setPage} />}
      </Card>

      {hasWrite && (
        <>
          <RecordDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            category={category}
            onSaved={invalidate}
            onError={setErrorMessage}
          />
          <RecordDialog
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            category={category}
            record={editTarget}
            onSaved={invalidate}
            onError={setErrorMessage}
          />
        </>
      )}

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kayıt Silme"
        description={`${deleteTarget?.title} — ${deleteTarget?.employee.firstName} ${deleteTarget?.employee.lastName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget!.id)}>
              {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Bu kaydı silmek istediğinize emin misiniz?</p>
      </Dialog>
    </div>
  );
}

function RecordDialog({
  open,
  onClose,
  category,
  record,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  category: EmployeeRecordCategory;
  record?: EmployeeRecord | null;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const isEdit = !!record;
  const types = categoryTypes(category);

  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? '');
  const [type, setType] = useState<EmployeeRecordType>(record?.type ?? types[0]);
  const [title, setTitle] = useState(record?.title ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [date, setDate] = useState(record?.date?.slice(0, 10) ?? NOW.toISOString().slice(0, 10));
  const [note, setNote] = useState(record?.note ?? '');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-records'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      employeeRecordApi.create({
        employeeId,
        category,
        type,
        title,
        description: description.trim() || undefined,
        date,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      await onSaved();
      onClose();
    },
    onError: (error) => onError(formatError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      employeeRecordApi.update(record!.id, {
        type,
        title,
        description: description.trim() || undefined,
        date,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      await onSaved();
      onClose();
    },
    onError: (error) => onError(formatError(error)),
  });

  const submit = () => {
    if (!employeeId || !title.trim()) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Kayıt Düzenle' : 'Yeni Kayıt'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!employeeId || !title.trim() || isPending} onClick={submit}>
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {!isEdit && (
          <div className="space-y-2">
            <Label>Personel *</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Seçin…</option>
              {employees?.items.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}{emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Tür *</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as EmployeeRecordType)}>
            {types.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Başlık *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Geç kalma uyarısı" />
        </div>
        <div className="space-y-2">
          <Label>Tarih</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Açıklama</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="detay…" />
        </div>
        <div className="space-y-2">
          <Label>Not</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ek not…" />
        </div>
      </div>
    </Dialog>
  );
}