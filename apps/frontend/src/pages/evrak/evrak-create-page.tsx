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
import { documentApi, type DocumentPriority, DOCUMENT_PRIORITY_META } from '@/features/evrak/api';
import { formatError } from '@/lib/utils';

export function EvrakCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [documentNo, setDocumentNo] = useState('');
  const [subject, setSubject] = useState('');
  const [processType, setProcessType] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [priority, setPriority] = useState<DocumentPriority>('NORMAL');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      documentApi.create({
        documentNo: documentNo || undefined,
        subject,
        processType: processType || undefined,
        employeeId: employeeId || undefined,
        priority,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/evrak');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = Boolean(subject);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni Evrak Kaydı"
        description="Gelen/Giden evrakları veya iç yazışmaları sisteme kaydedin"
        actions={
          <Link to="/evrak" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>Evrak Detayları</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Evrak Konusu *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Örn: X Firması İhale Başvurusu" />
          </div>

          <div className="space-y-2">
            <Label>Evrak Kayıt / Dosya No</Label>
            <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="Örn: EVR-2026-001" />
          </div>

          <div className="space-y-2">
            <Label>Evrak Türü / İşlem Tipi</Label>
            <Input value={processType} onChange={(e) => setProcessType(e.target.value)} placeholder="Örn: Gelen Evrak, Dilekçe..." />
          </div>

          <div className="space-y-2">
            <Label>İlgili Personel (Opsiyonel)</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Bağlantı yok (Genel)</option>
              {employees?.items.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                  {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Öncelik</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as DocumentPriority)}>
              {Object.entries(DOCUMENT_PRIORITY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Geliş / Kayıt Tarihi</Label>
            <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/evrak" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Save /> {createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}
