import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeesApi } from '@/features/personel/api';
import { formatDate, formatDateTime, formatError } from '@/lib/utils';

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? '-'}</div>
    </div>
  );
}

export function PersonelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PASSIVE' | 'SUSPENDED') => employeesApi.setStatus(id!, status),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setStatusMessage(`Durum "${updated.status}" olarak güncellendi.`);
    },
    onError: (error) => setStatusMessage(`Hata: ${formatError(error)}`),
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;
  }

  if (!employee) {
    return <div className="text-sm text-muted-foreground">Personel bulunamadı.</div>;
  }

  const upcomingTabs = [
    'İzinler',
    'Puantaj',
    'Maaş ve Prim',
    'Avanslar',
    'Mesai',
    'Çalışma Planı',
    'Giriş-Çıkış',
    'Ceza/Ödül',
    'Yol Parası',
    'Zimmetler',
    'Evraklar',
    'Görevler',
    'Raporlar',
  ].map((label) => ({ value: label, label, content: <ComingSoon /> }));

  const tabs = [
    {
      value: 'genel',
      label: 'Genel Bilgiler',
      content: (
        <Card>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="E-posta" value={employee.email} />
            <InfoRow label="Kişisel Telefon" value={employee.phone} />
            <InfoRow label="Dahili Telefon" value={employee.internalPhone} />
            <InfoRow label="Dış Hat" value={employee.externalLine} />
            <InfoRow label="Departman" value={employee.department?.name} />
            <InfoRow label="Birim" value={employee.unit?.name} />
            <InfoRow label="Görev Yeri" value={employee.workLocation?.name} />
            <InfoRow label="Unvan" value={employee.title?.name} />
            <InfoRow label="Görev / Pozisyon" value={employee.position?.name} />
            <InfoRow label="Yönetici" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : undefined} />
            <InfoRow label="İşe Başlama" value={formatDate(employee.workStartDate)} />
            <InfoRow label="İşten Ayrılma" value={formatDate(employee.workEndDate)} />
            <InfoRow label="Kullanıcı Hesabı" value={employee.user?.username} />
            <InfoRow label="Sicil No" value={employee.employeeNo} />
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'ozluk',
      label: 'Özlük',
      content: (
        <Card>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-3">
            <InfoRow label="TC Kimlik No" value={employee.identityNo} />
            <InfoRow label="Doğum Tarihi" value={formatDate(employee.birthDate)} />
            <InfoRow label="Cinsiyet" value={employee.gender} />
            <InfoRow label="Medeni Durum" value={employee.maritalStatus} />
            <InfoRow label="Kan Grubu" value={employee.bloodType} />
            <InfoRow label="Öğrenim Durumu" value={employee.educationLevel} />
            <InfoRow label="Not" value={employee.note} />
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'gorev-gecmisi',
      label: 'Görev Geçmişi',
      content: (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Değişiklik</TableHead>
                <TableHead>Departman</TableHead>
                <TableHead>Birim</TableHead>
                <TableHead>Görev Yeri</TableHead>
                <TableHead>Unvan</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.history?.length ? (
                employee.history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDateTime(h.effectiveDate)}</TableCell>
                    <TableCell><Badge variant="secondary">{h.changeType}</Badge></TableCell>
                    <TableCell>{h.department?.name ?? '-'}</TableCell>
                    <TableCell>{h.unit?.name ?? '-'}</TableCell>
                    <TableCell>{h.workLocation?.name ?? '-'}</TableCell>
                    <TableCell>{h.title?.name ?? '-'}</TableCell>
                    <TableCell>{h.note ?? '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Kayıt yok</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ),
    },
    ...upcomingTabs,
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Personel Detayı"
        description={`${employee.firstName} ${employee.lastName}`}
        actions={
          <Link to="/personel" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Personel Listesi
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar src={employee.photoUrl} firstName={employee.firstName} lastName={employee.lastName} className="size-16 text-lg" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">
                {employee.firstName} {employee.lastName}
              </h2>
              <StatusBadge status={employee.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              {[employee.position?.name, employee.title?.name].filter(Boolean).join(' · ') || 'Görev tanımlı değil'}
            </div>
            <div className="text-sm text-muted-foreground">
              {[employee.department?.name, employee.unit?.name, employee.workLocation?.name].filter(Boolean).join(' / ')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {employee.status !== 'ACTIVE' && (
              <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('ACTIVE')}>
                Aktifleştir
              </Button>
            )}
            {employee.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('PASSIVE')}>
                Pasif Yap
              </Button>
            )}
          </div>
        </CardContent>
        <CardDescription className="px-6 pb-4 text-xs">
          Son hareket: {formatDateTime(employee.updatedAt ?? employee.createdAt)} · Bekleyen işlem: -{' '}
          {statusMessage && <RefreshCw className="inline size-3" />} {statusMessage}
        </CardDescription>
      </Card>

      <Tabs tabs={tabs} />
    </div>
  );
}

function ComingSoon() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yakında</CardTitle>
        <CardDescription>Bu modül MVP kapsamı dışında; ilerleyen sürümlerde eklenecek.</CardDescription>
      </CardHeader>
    </Card>
  );
}