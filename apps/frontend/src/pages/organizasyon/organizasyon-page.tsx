import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { ORG_GROUPS, orgApi, type OrgGroup, type OrgItem } from '@/features/organizasyon/api';
import { formatError } from '@/lib/utils';

interface FieldConfig {
  name: string;
  label: string;
  required?: boolean;
  selectOptions?: OrgGroup;
}

const GROUP_FIELDS: Record<OrgGroup, FieldConfig[]> = {
  companies: [
    { name: 'name', label: 'Kurum adı', required: true },
    { name: 'shortName', label: 'Kısa ad' },
    { name: 'taxNo', label: 'Vergi No' },
    { name: 'address', label: 'Adres' },
  ],
  departments: [
    { name: 'companyId', label: 'Bağlı Kurum', required: true, selectOptions: 'companies' },
    { name: 'name', label: 'Departman adı', required: true },
    { name: 'code', label: 'Kod' },
    { name: 'description', label: 'Açıklama' },
  ],
  units: [
    { name: 'departmentId', label: 'Bağlı Departman', required: true, selectOptions: 'departments' },
    { name: 'name', label: 'Birim adı', required: true },
    { name: 'code', label: 'Kod' },
    { name: 'description', label: 'Açıklama' },
  ],
  'work-locations': [
    { name: 'name', label: 'Görev yeri adı', required: true },
    { name: 'code', label: 'Kod' },
    { name: 'address', label: 'Adres' },
  ],
  titles: [
    { name: 'name', label: 'Unvan adı', required: true },
    { name: 'code', label: 'Kod' },
  ],
  positions: [
    { name: 'name', label: 'Pozisyon adı', required: true },
    { name: 'code', label: 'Kod' },
  ],
};

type EditableState = { mode: 'create' } | { mode: 'edit'; id: string; item: OrgItem } | null;

function OrgGroupManager({ group, singular }: { group: OrgGroup; singular: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editable, setEditable] = useState<EditableState>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrgItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['org', group, search],
    queryFn: () => orgApi.list(group, { pageSize: 200, search: search || undefined }),
  });

  const selectField = GROUP_FIELDS[group].find((f) => f.selectOptions);
  const { data: selectOptions } = useQuery({
    queryKey: ['org-select', selectField?.selectOptions],
    queryFn: () => orgApi.list(selectField!.selectOptions as OrgGroup, { pageSize: 200 }),
    enabled: !!selectField,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['org', group] });
    await queryClient.invalidateQueries({ queryKey: [`${group}-all`] });
  };

  const openCreate = () => {
    const initial: Record<string, string> = {};
    GROUP_FIELDS[group].forEach((f) => (initial[f.name] = ''));
    setValues(initial);
    setErrorMessage(null);
    setEditable({ mode: 'create' });
  };

  const openEdit = (item: OrgItem) => {
    const initial: Record<string, string> = { name: item.name };
    GROUP_FIELDS[group].forEach((f) => {
      if (f.name !== 'name') initial[f.name] = (item as unknown as Record<string, unknown>)[f.name] ? String((item as unknown as Record<string, unknown>)[f.name]) : '';
    });
    setValues(initial);
    setErrorMessage(null);
    setEditable({ mode: 'edit', id: item.id, item });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const f of GROUP_FIELDS[group]) {
        const v = values[f.name]?.trim() ?? '';
        if (v) payload[f.name] = v;
      }
      if (!payload.name) throw new Error('Ad alanı zorunlu.');
      const requiredFk = GROUP_FIELDS[group].find((f) => f.required && f.selectOptions);
      if (requiredFk && !payload[requiredFk.name]) {
        throw new Error(`${requiredFk.label} zorunludur.`);
      }
      if (editable?.mode === 'edit') {
        return orgApi.update(group, editable.id, payload);
      }
      return orgApi.create(group, payload);
    },
    onSuccess: async () => {
      await invalidate();
      setEditable(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orgApi.remove(group, id),
    onSuccess: async () => {
      await invalidate();
      setConfirmDelete(null);
    },
    onError: (error) => {
      setConfirmDelete(null);
      setErrorMessage(formatError(error));
    },
  });

  return (
    <div className="space-y-4">
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Ara…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}>
          <Plus /> {singular} Ekle
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Kod</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-24 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.code ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Aktif' : 'Pasif'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Düzenle">
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(item)} title="Sil">
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Kayıt yok</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={editable !== null}
        onClose={() => setEditable(null)}
        title={editable?.mode === 'edit' ? `${singular} Düzenle` : `Yeni ${singular}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditable(null)}>Vazgeç</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {GROUP_FIELDS[group].map((field) => (
            <div key={field.name} className="space-y-2">
              <Label>
                {field.label}
                {field.required && ' *'}
              </Label>
              {field.selectOptions ? (
                <Select
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                >
                  <option value="">Seçin…</option>
                  {selectOptions?.items.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Silme onayı"
        description={`"${confirmDelete?.name}" kalıcı olarak silinecek. Eminseniz onaylayın.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}>
              {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Bağlı kayıtları olan kayıtlar silinemez.</p>
      </Dialog>
    </div>
  );
}

export function OrganizasyonPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Organizasyon Yapısı"
        description="Kurum, departman, birim, görev yeri, unvan ve pozisyon tanımları"
      />
      <Tabs
        tabs={ORG_GROUPS.map((g) => ({
          value: g.route,
          label: g.label,
          content: <OrgGroupManager key={g.route} group={g.route} singular={g.singular} />,
        }))}
      />
    </div>
  );
}