import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Check, Plus, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth';
import { assetApi, ASSET_STATUS_META, type AssetStatus, type Asset } from '@/features/zimmet/api';
import { formatError, formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

export function ZimmetListPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const profile = useAuthStore((s) => s.profile);

  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [returnTarget, setReturnTarget] = useState<Asset | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Asset | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', status, search, page],
    queryFn: () =>
      assetApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: (status || undefined) as AssetStatus | undefined,
        q: search || undefined,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

  const returnMutation = useMutation({
    mutationFn: () => assetApi.returnItem(returnTarget!.id),
    onSuccess: async () => {
      await invalidate();
      setReturnTarget(null);
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => assetApi.approveAssignment(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => assetApi.rejectAssignment(rejectTarget!.id, rejectReason.trim() || undefined),
    onSuccess: async () => {
      await invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const requestReturnMutation = useMutation({
    mutationFn: (id: string) => assetApi.requestReturn(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const cancelReturnMutation = useMutation({
    mutationFn: (id: string) => assetApi.cancelReturn(id),
    onSuccess: async () => invalidate(),
    onError: (error) => setErrorMessage(formatError(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Zimmet Yönetimi"
        description={`${data?.total ?? 0} zimmet kaydı`}
        actions={
          hasPermission('asset:write') ? (
            <Link to="/zimmet/yeni" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" /> Zimmet Ekle
            </Link>
          ) : undefined
        }
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(ASSET_STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Input
          placeholder="Personel veya malzeme ara..."
          className="w-64"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personel</TableHead>
              <TableHead>Malzeme</TableHead>
              <TableHead>Seri No</TableHead>
              <TableHead>Teslim Tarihi</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-40 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="leading-tight">
                    <div className="font-medium">
                      {entry.employee.firstName} {entry.employee.lastName}
                    </div>
                    {entry.employee.employeeNo && (
                      <div className="text-xs text-muted-foreground">{entry.employee.employeeNo}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{entry.name}</div>
                  <div className="text-xs text-muted-foreground">{entry.category ?? '-'}</div>
                </TableCell>
                <TableCell>{entry.serialNo ?? '-'}</TableCell>
                <TableCell>{formatDate(entry.assignedDate)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={ASSET_STATUS_META[entry.status].variant} 
                  >
                    {ASSET_STATUS_META[entry.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {entry.status === 'PENDING_APPROVAL' && profile?.employeeId === entry.employeeId && hasPermission('asset:approve') && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          title="Zimmeti onayla"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(entry.id)}
                        >
                          <Check className="mr-1 h-3 w-3" /> Onayla
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          title="Zimmeti reddet"
                          onClick={() => { setRejectTarget(entry); setRejectReason(''); }}
                        >
                          <X className="mr-1 h-3 w-3" /> Reddet
                        </Button>
                      </>
                    )}

                    {entry.status === 'ASSIGNED' && profile?.employeeId === entry.employeeId && hasPermission('asset:approve') && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="İade talebi oluştur"
                        disabled={requestReturnMutation.isPending}
                        onClick={() => requestReturnMutation.mutate(entry.id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> İade Talep Et
                      </Button>
                    )}

                    {entry.status === 'RETURN_PENDING' && (
                      <>
                        {profile?.employeeId === entry.employeeId && hasPermission('asset:approve') && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="İade talebini geri çek"
                            disabled={cancelReturnMutation.isPending}
                            onClick={() => cancelReturnMutation.mutate(entry.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Geri Çek
                          </Button>
                        )}
                        {hasPermission('asset:return') && (
                          <Button
                            variant="success"
                            size="sm"
                            title="İadeyi onayla"
                            disabled={returnMutation.isPending}
                            onClick={() => setReturnTarget(entry)}
                          >
                            <Check className="mr-1 h-3 w-3" /> İade Onayla
                          </Button>
                        )}
                        {hasPermission('asset:return') && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="İade talebini reddet"
                            disabled={cancelReturnMutation.isPending}
                            onClick={() => cancelReturnMutation.mutate(entry.id)}
                          >
                            <X className="mr-1 h-3 w-3" /> Reddet
                          </Button>
                        )}
                      </>
                    )}

                    {entry.status === 'ASSIGNED' && hasPermission('asset:return') && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="İade Al"
                        onClick={() => setReturnTarget(entry)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> İade Al
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Archive className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && data.total > 0 && (
          <div className="p-4">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Dialog
        open={returnTarget !== null}
        onClose={() => setReturnTarget(null)}
        title="Zimmet İade Alma"
        description={returnTarget ? `${returnTarget.employee.firstName} ${returnTarget.employee.lastName} üzerindeki "${returnTarget.name}" adlı malzemeyi iade almak istiyor musunuz?` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Vazgeç</Button>
            <Button disabled={returnMutation.isPending} onClick={() => returnMutation.mutate()}>
              {returnMutation.isPending ? 'İşleniyor…' : 'İade Al'}
            </Button>
          </>
        }
      >
        <></>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Zimmet Reddi"
        description={rejectTarget ? `${rejectTarget.employee.firstName} ${rejectTarget.employee.lastName} üzerindeki "${rejectTarget.name}" zimmeti reddedilecek.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Vazgeç</Button>
            <Button variant="destructive" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? 'Reddediliyor…' : 'Reddet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <Label>Red nedeni</Label>
          <Input
            placeholder="Opsiyonel — gerekçe bildirilebilir"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
