import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeesApi } from '@/features/personel/api';
import { orgApi } from '@/features/organizasyon/api';
import { cn, formatError } from '@/lib/utils';

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function PersonelListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [departmentId, setDepartmentId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [workLocationId, setWorkLocationId] = useState('');
  const [titleId, setTitleId] = useState('');
  const [status, setStatus] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { page, pageSize, search: debouncedSearch, departmentId, unitId, workLocationId, titleId, status }],
    queryFn: () =>
      employeesApi.list({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        departmentId: departmentId || undefined,
        unitId: unitId || undefined,
        workLocationId: workLocationId || undefined,
        titleId: titleId || undefined,
        status: status || undefined,
      }),
  });

  const { data: departments } = useQuery({ queryKey: ['departments-all'], queryFn: () => orgApi.list('departments', { pageSize: 200 }) });
  const { data: units } = useQuery({ queryKey: ['units-all'], queryFn: () => orgApi.list('units', { pageSize: 200 }) });
  const { data: locations } = useQuery({ queryKey: ['locations-all'], queryFn: () => orgApi.list('work-locations', { pageSize: 200 }) });
  const { data: titles } = useQuery({ queryKey: ['titles-all'], queryFn: () => orgApi.list('titles', { pageSize: 200 }) });

  const resetPage = () => setPage(1);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const all = data?.items.map((e) => e.id) ?? [];
      const next = new Set(prev);
      const allSelected = all.every((id) => next.has(id));
      if (allSelected) {
        all.forEach((id) => next.delete(id));
      } else {
        all.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const bulkMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map((id) => employeesApi.setStatus(id, bulkStatus)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      setBulkResult(`${selected.size} personelin durumu "${bulkStatus === 'ACTIVE' ? 'Aktif' : 'Pasif'}" olarak güncellendi.`);
      setSelected(new Set());
      setBulkOpen(false);
    },
    onError: (error) => setBulkResult(`Hata: ${formatError(error)}`),
  });

  const allIds = data?.items.map((e) => e.id) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Personel Listesi"
        description={`${data?.total ?? 0} personel`}
        actions={
          <Link to="/personel/yeni" className={buttonVariants()}>
            <UserPlus /> Personel Ekle
          </Link>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Ara (ad, sicil, tel, e-posta)…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              resetPage();
            }}
          >
            <option value="">Departman</option>
            {departments?.items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={unitId} onChange={(e) => { setUnitId(e.target.value); resetPage(); }}>
            <option value="">Birim</option>
            {units?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select value={workLocationId} onChange={(e) => { setWorkLocationId(e.target.value); resetPage(); }}>
            <option value="">Görev yeri</option>
            {locations?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select value={titleId} onChange={(e) => { setTitleId(e.target.value); resetPage(); }}>
            <option value="">Unvan</option>
            {titles?.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}>
            <option value="">Durum</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="SUSPENDED">Askıda</option>
          </Select>
        </div>
      </Card>

      {selected.size > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm">
            <span className="font-semibold">{selected.size}</span> personel seçildi
          </div>
          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as 'ACTIVE' | 'PASSIVE')}>
              <option value="ACTIVE">Aktif yap</option>
              <option value="PASSIVE">Pasif yap</option>
            </Select>
<Button onClick={() => setBulkOpen(true)}>
            Toplu durum güncelle
          </Button>
          </div>
        </Card>
      )}

      {bulkResult && (
        <p className={cn('text-sm', bulkResult.startsWith('Hata') ? 'text-destructive' : 'text-emerald-700')}>{bulkResult}</p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allIds.length > 0 && allIds.every((id) => selected.has(id))}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Departman</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Unvan</TableHead>
              <TableHead>Görev yeri</TableHead>
              <TableHead>Dahili</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((employee) => (
              <TableRow key={employee.id} data-state={selected.has(employee.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(employee.id)}
                    onChange={() => toggle(employee.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link to={`/personel/${employee.id}`} className="flex items-center gap-2 hover:underline">
                    <Avatar src={employee.photoUrl} firstName={employee.firstName} lastName={employee.lastName} />
                    <div className="leading-tight">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      {employee.employeeNo && <div className="text-xs text-muted-foreground">{employee.employeeNo}</div>}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>{employee.department?.name ?? '-'}</TableCell>
                <TableCell>{employee.unit?.name ?? '-'}</TableCell>
                <TableCell>{employee.title?.name ?? '-'}</TableCell>
                <TableCell>{employee.workLocation?.name ?? '-'}</TableCell>
                <TableCell>{employee.internalPhone ?? '-'}</TableCell>
                <TableCell>{employee.phone ?? '-'}</TableCell>
                <TableCell>{employee.email ?? '-'}</TableCell>
                <TableCell>
                  <StatusBadge status={employee.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data && (
          <div className="p-4">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Toplu işlem onayı"
        description={`${selected.size} personel için "durum değişikliği" uygulanacak. Bu işlemi onaylıyor musunuz?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
              {bulkMutation.isPending ? 'Uygulanıyor…' : 'Onayla'}
            </Button>
          </>
        }
      >
        <div className="text-sm text-muted-foreground">
          Seçili personel sayısı: <span className="font-semibold text-foreground">{selected.size}</span>
          <br />
          Uygulanacak işlem:{' '}
          <span className="font-semibold text-foreground">Durumu {bulkStatus === 'ACTIVE' ? 'Aktif' : 'Pasif'} yap</span>
        </div>
      </Dialog>
    </div>
  );
}