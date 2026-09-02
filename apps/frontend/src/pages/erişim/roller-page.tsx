import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { accessApi, type Permission, type Role } from '@/features/erişim/api';
import { formatError } from '@/lib/utils';

type PermissionsState = { role: Role; selected: Set<string> } | null;

export function RollerPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionsState, setPermissionsState] = useState<PermissionsState>(null);

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => accessApi.roles() });
  const { data: permissions } = useQuery({ queryKey: ['permissions'], queryFn: () => accessApi.permissions() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['roles'] });
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const createRole = useMutation({
    mutationFn: () =>
      accessApi.createRole({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      setCreateOpen(false);
      setForm({ name: '', code: '', description: '' });
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!permissionsState) return;
      await accessApi.setRolePermissions(permissionsState.role.id, [...permissionsState.selected]);
    },
    onSuccess: async () => {
      await invalidate();
      setPermissionsState(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of permissions ?? []) {
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return [...groups.entries()];
  }, [permissions]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roller ve Yetkiler"
        description="Roller iş alanını, yetkiler gerçekleştirilebilir işlemleri temsil eder"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Rol Oluştur
          </Button>
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Kod</TableHead>
              <TableHead>Yetki Sayısı</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {roles?.map((role) => (
              <TableRow key={role.id} className="cursor-pointer" onClick={() => setPermissionsState({ role, selected: new Set(role.permissions.map((p) => p.id)) })}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    {role.name}
                    {role.isSystem && <Badge variant="secondary">sistem</Badge>}
                  </div>
                </TableCell>
                <TableCell>{role.code}</TableCell>
                <TableCell>{role.permissions.length}</TableCell>
                <TableCell>
                  <Badge variant={role.isActive ? 'success' : 'secondary'}>{role.isActive ? 'Aktif' : 'Pasif'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni Rol"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button disabled={createRole.isPending} onClick={() => createRole.mutate()}>
              {createRole.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Rol adı *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Kod *</Label>
            <Input placeholder="ornek-rol" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={permissionsState !== null}
        onClose={() => setPermissionsState(null)}
        title={permissionsState ? `Yetkiler: ${permissionsState.role.name}` : ''}
        description="Rola atanacak yetkileri seçin"
        footer={
          <>
            <Button variant="outline" onClick={() => setPermissionsState(null)}>Vazgeç</Button>
            <Button disabled={savePermissions.isPending} onClick={() => savePermissions.mutate()}>
              {savePermissions.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
          {groupedPermissions.map(([module, perms]) => (
            <div key={module}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{module}</div>
              <div className="space-y-1">
                {perms.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
                    <Checkbox
                      checked={permissionsState?.selected.has(p.id) ?? false}
                      onChange={(e) => {
                        setPermissionsState((state) => {
                          if (!state) return state;
                          const next = new Set(state.selected);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return { ...state, selected: next };
                        });
                      }}
                    />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.code}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}