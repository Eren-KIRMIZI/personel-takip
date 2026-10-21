import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UploadCloud, FileText, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { employeesApi } from '@/features/personel/api';
import { leaveApi, type LeaveDayPart } from '@/features/izin/api';
import { uploadFile } from '@/features/dosya/api';
import { useAuthStore } from '@/stores/auth';
import { formatError } from '@/lib/utils';

function calcDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (e.getTime() < s.getTime()) return null;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function IzinCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [halfDayType, setHalfDayType] = useState<LeaveDayPart | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 200 }),
  });
  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });

  const selectedType = types?.find((t) => t.id === leaveTypeId);
  const isMaternity = selectedType?.code === 'maternity';
  const days = useMemo(() => (isMaternity ? 0.5 : calcDays(startDate, endDate)), [startDate, endDate, isMaternity]);

  const isSelfOnly = !employeeId && profile?.employeeId != null;

  const createMutation = useMutation({
    mutationFn: () =>
      leaveApi.create({
        employeeId: isSelfOnly ? profile!.employeeId! : employeeId,
        leaveTypeId,
        startDate,
        endDate,
        description: description.trim() || undefined,
        documentUrl: documentUrl ?? undefined,
        halfDayType: isMaternity && halfDayType ? halfDayType : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      navigate('/izin');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = Boolean(
    (isSelfOnly || employeeId) && leaveTypeId && startDate && endDate && days != null && (days ?? 1) > 0 && (!isMaternity || !!halfDayType),
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    try {
      const { url } = await uploadFile(file, 'leave-docs');
      setDocumentUrl(url);
    } catch (err) {
      setErrorMessage(formatError(err));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni İzin Talebi"
        description="Personel, izin tipi ve tarih aralığı seçin"
        actions={
          <Link to="/izin" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>Talep Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Personel *</Label>
            {profile?.employeeId ? (
              <p className="text-sm text-muted-foreground">
                Kendim için talep oluşturulacak (personel kaydınızla ilişkiliyim)
              </p>
            ) : null}
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isSelfOnly}
            >
              <option value="">Seçin…</option>
              {employeesLoading ? (
                <option disabled>Yükleniyor…</option>
              ) : employeesError ? (
                <option disabled>Yüklenemedi</option>
              ) : employees?.items.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                  {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>İzin Tipi *</Label>
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Seçin…</option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.paid ? '' : '(ücretsiz)'}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Başlangıç Tarihi *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (isMaternity) setEndDate(e.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Bitiş Tarihi *</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (isMaternity) setStartDate(e.target.value);
              }}
              disabled={isMaternity}
            />
          </div>

          {isMaternity && (
            <div className="space-y-2">
              <Label>Yarım Gün Seçimi *</Label>
              <Select value={halfDayType} onChange={(e) => setHalfDayType(e.target.value as LeaveDayPart | '')}>
                <option value="">Seçin…</option>
                <option value="MORNING">Sabah</option>
                <option value="AFTERNOON">Öğleden Sonra</option>
              </Select>
              <p className="text-xs text-muted-foreground">Süt izni yalnızca tek gün ve yarım gün olarak verilebilir.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Rapor / Belge</Label>
            {documentUrl ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="size-4" /> Belge yüklendi
                </a>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setDocumentUrl(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground hover:bg-muted/60">
                <UploadCloud className="size-4" /> PDF veya görsel seçin (en fazla 10 MB)
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Hesaplanan Gün</Label>
            <Input value={days != null ? String(days) : '—'} disabled />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/izin" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Save /> {createMutation.isPending ? 'Gönderiliyor…' : 'Talebi Gönder'}
        </Button>
      </div>
    </div>
  );
}