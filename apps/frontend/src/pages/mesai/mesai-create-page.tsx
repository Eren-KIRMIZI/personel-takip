import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { employeesApi } from '@/features/personel/api';
import { overtimeApi } from '@/features/mesai/api';
import { formatError } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';

export function MesaiCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('1');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { profile } = useAuthStore();
  const isOnlyPersonel = profile?.roles.includes('PERSONEL') && !profile?.roles.includes('ADMIN');

  useEffect(() => {
    if (isOnlyPersonel && profile?.employeeId) {
      setEmployeeId(profile.employeeId);
    }
  }, [isOnlyPersonel, profile?.employeeId]);

  const { data: employees, isLoading: isLoadingEmployees, isError: isErrorEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      overtimeApi.create({
        employeeId,
        date,
        hours: Number(hours),
        rate: Number(rate) || 1,
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['overtimes'] });
      navigate('/mesai');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = employeeId && date && hours && Number(hours) > 0;

  const hoursNum = Number(hours) || 0;
  const rateNum = Number(rate) || 1;
  const calculated = employeeId && date && hoursNum > 0 ? hoursNum * (rateNum > 0 ? rateNum : 1) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni Mesai Kaydı"
        description="Personel, tarih ve süre bilgisi"
        actions={
          <Link to="/mesai" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>Mesai Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!isOnlyPersonel && (
            <div className="space-y-2 md:col-span-2">
              <Label>Personel *</Label>
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">
                  {isLoadingEmployees ? 'Yükleniyor...' : isErrorEmployees ? 'Personel listesi yüklenemedi' : 'Seçin…'}
                </option>
                {employees?.items.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                    {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mesai Tarihi *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Süre (saat) *</Label>
            <Input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Katsayı</Label>
            <Input type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Açıklama</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Hesaplanan (süre × katsayı)</Label>
            <Input value={calculated != null ? `${calculated.toLocaleString('tr-TR')} saat` : '—'} disabled />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/mesai" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Save /> {createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}