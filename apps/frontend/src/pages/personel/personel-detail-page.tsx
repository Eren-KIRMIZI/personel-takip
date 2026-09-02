import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  ShieldCheck,
  Power,
  PowerOff,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeesApi } from '@/features/personel/api';
import { formatDate, formatDateTime, formatError } from '@/lib/utils';
import {
  IzinlerTab, MesaiTab, GirisCikisTab, CalismaPlaniTab,
  MaasBordroTab, AvanslarTab, CezaTab, OdulTab, ZimmetTab, GorevTab, EvrakTab,
} from './personel-tabs';

function InfoField({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 text-sm text-foreground">
        {Icon && <Icon className="size-4 text-muted-foreground/60" />}
        <span className="font-medium">{value || '—'}</span>
      </div>
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
      setStatusMessage(`Durum "${updated.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}" yapıldı.`);
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error) => setStatusMessage(`Hata: ${formatError(error)}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <Hash className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Personel Bulunamadı</h2>
        <p className="mt-1 text-sm text-muted-foreground mb-4">Bu sicile veya kimliğe sahip bir kayıt yok.</p>
        <Link to="/personel" className={buttonVariants({ variant: 'outline' })}>Listeye Dön</Link>
      </div>
    );
  }

  const upcomingTabs = ['Yol Parası', 'Raporlar'].map((label) => ({
    value: label,
    label,
    content: <ComingSoon />,
  }));

  const tabs = [
    {
      value: 'genel',
      label: 'Genel Bilgiler',
      content: (
        <Card className="animate-fade-in">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Kurumsal İletişim & Görev</CardTitle>
            <CardDescription>Personelin kurum içi yerleşimi ve iletişim detayları.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField icon={Mail} label="E-posta" value={employee.email} />
            <InfoField icon={Phone} label="Kişisel Telefon" value={employee.phone} />
            <InfoField icon={Phone} label="Dahili / Dış" value={`${employee.internalPhone || '-'} / ${employee.externalLine || '-'}`} />
            <InfoField icon={Building2} label="Departman" value={employee.department?.name} />
            <InfoField icon={Building2} label="Birim" value={employee.unit?.name} />
            <InfoField icon={Hash} label="Görev Yeri" value={employee.workLocation?.name} />
            <InfoField icon={Hash} label="Unvan" value={employee.title?.name} />
            <InfoField icon={Hash} label="Pozisyon" value={employee.position?.name} />
            <InfoField icon={CalendarDays} label="İşe Başlama" value={formatDate(employee.workStartDate)} />
            <InfoField icon={CalendarDays} label="İşten Ayrılma" value={formatDate(employee.workEndDate)} />
            <InfoField icon={ShieldCheck} label="Kullanıcı Hesabı" value={employee.user?.username} />
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'ozluk',
      label: 'Özlük',
      content: (
        <Card className="animate-fade-in">
           <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="TC Kimlik No" value={employee.identityNo} />
            <InfoField label="Doğum Tarihi" value={formatDate(employee.birthDate)} />
            <InfoField label="Cinsiyet" value={employee.gender} />
            <InfoField label="Medeni Durum" value={employee.maritalStatus} />
            <InfoField label="Kan Grubu" value={employee.bloodType} />
            <InfoField label="Öğrenim Durumu" value={employee.educationLevel} />
            <div className="col-span-full">
              <InfoField label="Not" value={employee.note} />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'gorev-gecmisi',
      label: 'Görev Geçmişi',
      content: (
        <Card className="animate-fade-in">
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
                    <TableCell><Badge variant="secondary" className="font-mono">{h.changeType}</Badge></TableCell>
                    <TableCell>{h.department?.name ?? '-'}</TableCell>
                    <TableCell>{h.unit?.name ?? '-'}</TableCell>
                    <TableCell>{h.workLocation?.name ?? '-'}</TableCell>
                    <TableCell>{h.title?.name ?? '-'}</TableCell>
                    <TableCell>{h.note ?? '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Görev geçmişi kaydı bulunamadı.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ),
    },
    { value: 'izinler', label: 'İzinler', content: <IzinlerTab employeeId={employee.id} /> },
    { value: 'mesai', label: 'Mesai', content: <MesaiTab employeeId={employee.id} /> },
    { value: 'giris-cikis', label: 'Giriş-Çıkış', content: <GirisCikisTab employeeId={employee.id} /> },
    { value: 'calisma-plani', label: 'Çalışma Planı', content: <CalismaPlaniTab employeeId={employee.id} /> },
    { value: 'maas-prim', label: 'Maaş ve Prim', content: <MaasBordroTab employeeId={employee.id} /> },
    { value: 'avanslar', label: 'Avanslar', content: <AvanslarTab employeeId={employee.id} /> },
    { value: 'ceza', label: 'Ceza', content: <CezaTab employeeId={employee.id} /> },
    { value: 'odul', label: 'Ödül', content: <OdulTab employeeId={employee.id} /> },
    { value: 'zimmetler', label: 'Zimmetler', content: <ZimmetTab employeeId={employee.id} /> },
    { value: 'gorevler', label: 'Görevler', content: <GorevTab employeeId={employee.id} /> },
    { value: 'evraklar', label: 'Evraklar', content: <EvrakTab employeeId={employee.id} /> },
    ...upcomingTabs,
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ── Top Nav ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/personel"
          className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-card group-hover:bg-accent transition-colors">
            <ArrowLeft className="size-4" />
          </div>
          Geri Dön
        </Link>

        {statusMessage && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-fade-in">
            <RefreshCw className="size-3 animate-spin" />
            {statusMessage}
          </span>
        )}
      </div>

      {/* ── Hero Profile Card ─────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-md)]">
        {/* Abstract background gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        
        <div className="relative p-6 pt-12 sm:px-8 sm:pt-16 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          <Avatar
            src={employee.photoUrl}
            firstName={employee.firstName}
            lastName={employee.lastName}
            className="size-28 text-3xl shadow-lg ring-4 ring-card"
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
                {employee.firstName} {employee.lastName}
              </h1>
              <StatusBadge status={employee.status} />
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-foreground/80">
              <span className="flex items-center gap-1.5">
                <Hash className="size-4 text-muted-foreground" />
                Sicil: {employee.employeeNo || '—'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4 text-muted-foreground" />
                {[employee.department?.name, employee.unit?.name].filter(Boolean).join(' / ') || 'Birim atanmamış'}
              </span>
              <span>·</span>
              <span className="font-medium text-primary">
                {employee.title?.name || 'Unvan yok'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {employee.status !== 'ACTIVE' ? (
              <Button
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('ACTIVE')}
                className="w-full sm:w-auto"
                variant="success"
              >
                <Power className="mr-2" /> Aktifleştir
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('PASSIVE')}
                className="w-full sm:w-auto text-muted-foreground"
              >
                <PowerOff className="mr-2" /> Pasif Yap
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs Content ──────────────────────────── */}
      <Tabs tabs={tabs} />
    </div>
  );
}

function ComingSoon() {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
          <CalendarDays className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Yakında</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Bu modül MVP kapsamı dışında bırakılmıştır, ilerleyen sürümlerde güncellemeyle eklenecektir.
        </p>
      </CardContent>
    </Card>
  );
}