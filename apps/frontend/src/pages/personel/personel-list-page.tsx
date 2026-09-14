import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
  Users,
  CheckSquare,
} from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const hasActiveFilters = !!(departmentId || unitId || workLocationId || titleId || status);

  const { data, isLoading } = useQuery({
    queryKey: [
      'employees',
      { page, pageSize, search: debouncedSearch, departmentId, unitId, workLocationId, titleId, status },
    ],
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

  const { data: departments } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => orgApi.list('departments', { pageSize: 200 }),
  });
  const { data: units } = useQuery({
    queryKey: ['units-all'],
    queryFn: () => orgApi.list('units', { pageSize: 200 }),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations-all'],
    queryFn: () => orgApi.list('work-locations', { pageSize: 200 }),
  });
  const { data: titles } = useQuery({
    queryKey: ['titles-all'],
    queryFn: () => orgApi.list('titles', { pageSize: 200 }),
  });

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
      if (allSelected) all.forEach((id) => next.delete(id));
      else all.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map((id) => employeesApi.setStatus(id, bulkStatus)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      setBulkResult(
        `${selected.size} personelin durumu "${bulkStatus === 'ACTIVE' ? 'Aktif' : 'Pasif'}" olarak güncellendi.`,
      );
      setSelected(new Set());
      setBulkOpen(false);
    },
    onError: (error) => setBulkResult(`Hata: ${formatError(error)}`),
  });

  const allIds = data?.items.map((e) => e.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        title="Personel Listesi"
        description={
          data ? `${data.total} personel kayıtlı` : 'Personeller yükleniyor…'
        }
        actions={
          <Link to="/personel/yeni" className={buttonVariants()}>
            <UserPlus />
            Personel Ekle
          </Link>
        }
      />

      {/* ── Search & filter bar ─────────────────── */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Ara…"
              className="pl-8 h-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); resetPage(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(hasActiveFilters && 'border-primary text-primary')}
          >
            <SlidersHorizontal className="size-3.5" />
            Filtrele
            {hasActiveFilters && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {[departmentId, unitId, workLocationId, titleId, status].filter(Boolean).length}
              </span>
            )}
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-150', showFilters && 'rotate-180')}
            />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDepartmentId('');
                setUnitId('');
                setWorkLocationId('');
                setTitleId('');
                setStatus('');
                resetPage();
              }}
              className="text-muted-foreground"
            >
              <X className="size-3.5" />
              Temizle
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 animate-fade-in">
            <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); resetPage(); }}>
              <option value="">Tüm departmanlar</option>
              {departments?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select value={unitId} onChange={(e) => { setUnitId(e.target.value); resetPage(); }}>
              <option value="">Tüm birimler</option>
              {units?.items.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
            <Select value={workLocationId} onChange={(e) => { setWorkLocationId(e.target.value); resetPage(); }}>
              <option value="">Tüm görev yerleri</option>
              {locations?.items.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
            <Select value={titleId} onChange={(e) => { setTitleId(e.target.value); resetPage(); }}>
              <option value="">Tüm unvanlar</option>
              {titles?.items.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}>
              <option value="">Tüm durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
              <option value="SUSPENDED">Askıda</option>
            </Select>
          </div>
        )}
      </Card>

      {/* ── Bulk result feedback ─────────────────── */}
      {bulkResult && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm',
            bulkResult.startsWith('Hata')
              ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/60'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60',
          )}
        >
          <span>{bulkResult}</span>
          <button
            type="button"
            onClick={() => setBulkResult(null)}
            className="ml-2 opacity-60 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────── */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Departman</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Unvan</TableHead>
              <TableHead>Görev Yeri</TableHead>
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
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
                      <Users className="size-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Personel bulunamadı</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Arama kriterlerini değiştirmeyi deneyin
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((employee) => (
              <TableRow
                key={employee.id}
                data-state={selected.has(employee.id) ? 'selected' : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={selected.has(employee.id)}
                    onChange={() => toggle(employee.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to={`/personel/${employee.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <Avatar
                      src={employee.photoUrl}
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                      className="size-8 text-xs"
                    />
                    <div className="leading-tight">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors duration-150">
                        {employee.firstName} {employee.lastName}
                      </div>
                      {employee.employeeNo && (
                        <div className="text-xs text-muted-foreground font-mono">
                          #{employee.employeeNo}
                        </div>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{employee.department?.name ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{employee.unit?.name ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{employee.title?.name ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground/80">{employee.workLocation?.name ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-foreground/70">{employee.internalPhone ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-foreground/70">{employee.phone ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-foreground/70">{employee.email ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={employee.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && data.total > pageSize && (
          <div className="border-t border-border px-4 py-3">
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* ── Floating bulk action bar (Gmail/Linear style) ─ */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-[var(--shadow-xl)]">
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {selected.size} personel seçildi
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <Select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as 'ACTIVE' | 'PASSIVE')}
              className="h-8 text-xs"
            >
              <option value="ACTIVE">Aktif yap</option>
              <option value="PASSIVE">Pasif yap</option>
            </Select>
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              Uygula
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk confirm dialog ──────────────────── */}
      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Toplu işlem onayı"
        description={`${selected.size} personel için durum değişikliği uygulanacak.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Vazgeç
            </Button>
            <Button
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate()}
            >
              {bulkMutation.isPending ? 'Uygulanıyor…' : 'Onayla'}
            </Button>
          </>
        }
      >
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seçili personel</span>
            <span className="font-semibold">{selected.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uygulanacak durum</span>
            <span className="font-semibold">{bulkStatus === 'ACTIVE' ? 'Aktif' : 'Pasif'}</span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}