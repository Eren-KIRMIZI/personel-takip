import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { documentApi, DOCUMENT_STATUS_META, DOCUMENT_PRIORITY_META, type DocumentStatus } from '@/features/evrak/api';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 15;

export function EvrakListPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', status, search, page],
    queryFn: () =>
      documentApi.list({
        page,
        pageSize: PAGE_SIZE,
        status: (status || undefined) as DocumentStatus | undefined,
        search: search || undefined,
      }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Evrak Yönetimi"
        description={`${data?.total ?? 0} evrak kaydı`}
        actions={
          hasPermission('document:write') ? (
            <Link to="/evrak/yeni" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Evrak
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(DOCUMENT_STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Input
          placeholder="Evrak No, Konu vb..."
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
              <TableHead>Evrak No</TableHead>
              <TableHead>Konu</TableHead>
              <TableHead>İlgili Personel</TableHead>
              <TableHead>Geliş Tarihi</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
            {data?.items.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-sm">{doc.documentNo ?? '-'}</TableCell>
                <TableCell>
                  <div className="font-medium">{doc.subject}</div>
                  <div className="text-xs text-muted-foreground">{doc.processType ?? '-'}</div>
                </TableCell>
                <TableCell>
                  {doc.employee ? (
                    `${doc.employee.firstName} ${doc.employee.lastName}`
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(doc.receivedAt)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={DOCUMENT_PRIORITY_META[doc.priority].variant} 
                  >
                    {DOCUMENT_PRIORITY_META[doc.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={DOCUMENT_STATUS_META[doc.status].variant} 
                  >
                    {DOCUMENT_STATUS_META[doc.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
    </div>
  );
}
