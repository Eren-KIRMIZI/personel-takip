import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { auditApi } from '@/features/islem-loglari/api';

export function IslemLoglariPage() {
  const [actionFilter, setActionFilter] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: () => auditApi.list({ action: actionFilter || undefined, pageSize: 100 }),
  });

  return (
    <div className="space-y-4">
      <PageHeader 
        title="İşlem Logları (Audit)" 
        description="Sistem genelinde yapılan kayıt, güncelleme ve silme işlemlerinin dökümü" 
      />

      <div className="flex items-center space-x-2">
        <Input 
          placeholder="İşlem tipine göre filtrele (örn: bonus.create)" 
          className="max-w-sm"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>İşlem Modülü</TableHead>
                <TableHead>İşlem (Aksiyon)</TableHead>
                <TableHead>Sonuç</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Kayıt bulunamadı</TableCell>
                </TableRow>
              ) : (
                data?.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString('tr-TR')}</TableCell>
                    <TableCell>
                      {log.actor?.employee 
                        ? `${log.actor.employee.firstName} ${log.actor.employee.lastName}` 
                        : log.actor?.username ?? 'Sistem'}
                    </TableCell>
                    <TableCell className="uppercase text-xs font-medium text-muted-foreground">
                      {log.entityType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.result === 'SUCCESS' ? 'success' : 'destructive'}>
                        {log.result}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
