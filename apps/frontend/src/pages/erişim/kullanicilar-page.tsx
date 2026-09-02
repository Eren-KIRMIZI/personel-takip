import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { accessApi, type Role, type UserRow } from '@/features/erişim/api';
import { formatDateTime, formatError } from '@/lib/utils';

type RolesState = { user: UserRow; selected: Set<string> } | null;

export function KullanicilarPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [rolesState, setRolesState] = useState<RolesState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => accessApi.users(search || undefined),
  });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => accessApi.roles() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const saveRoles = useMutation({
    mutationFn: async () => {
      if (!rolesState) return;
      await accessApi.setUserRoles(rolesState.user.id, [...rolesState.selected]);
    },
    onSuccess: async () => {
      await invalidate();
      setRolesState(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const toggleStatus = useMutation({
    mutationFn: (user: UserRow) => accessApi.setUserStatus(user.id, user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Kullanıcılar" description="Kullanıcı hesapları ve rol atamaları" />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Ara (kullanıcı adı, e-posta)…"
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Roller</TableHead>
              <TableHead>Son Giriş</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-40 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserCog className="size-4 text-muted-foreground" />
                    <div className="leading-tight">
                      <div className="font-medium">{user.username}</div>
                      {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length ? (
                      user.roles.map(({ role }) => (
                        <Badge key={role.id} variant="secondary">{role.name}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Rol yok</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                <TableCell><StatusBadge status={user.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRolesState({ user, selected: new Set(user.roles.map((r) => r.role.id)) })}
                    >
                      Roller
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={toggleStatus.isPending}
                      onClick={() => toggleStatus.mutate(user)}
                    >
                      {user.status === 'ACTIVE' ? 'Pasifleştir' : 'Aktifleştir'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={rolesState !== null}
        onClose={() => setRolesState(null)}
        title={rolesState ? `Roller: ${rolesState.user.username}` : ''}
        description="Kullanıcıya atanacak rolleri seçin"
        footer={
          <>
            <Button variant="outline" onClick={() => setRolesState(null)}>Vazgeç</Button>
            <Button disabled={saveRoles.isPending} onClick={() => saveRoles.mutate()}>
              {saveRoles.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          {roles?.map((role: Role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-accent">
              <Checkbox
                checked={rolesState?.selected.has(role.id) ?? false}
                onChange={(e) => {
                  setRolesState((state) => {
                    if (!state) return state;
                    const next = new Set(state.selected);
                    if (e.target.checked) next.add(role.id);
                    else next.delete(role.id);
                    return { ...state, selected: next };
                  });
                }}
              />
              <span className="font-medium">{role.name}</span>
              <span className="text-xs text-muted-foreground">{role.code}</span>
            </label>
          ))}
        </div>
      </Dialog>
    </div>
  );
}