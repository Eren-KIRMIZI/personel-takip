import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { employeesApi } from '@/features/personel/api';
import { taskApi, type TaskPriority, TASK_PRIORITY_META } from '@/features/gorev/api';
import { formatError } from '@/lib/utils';

export function GorevCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: employees, isLoading: isLoadingEmployees, isError: isErrorEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const { data: existingTask } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.find(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingTask) {
      setEmployeeId(existingTask.employeeId);
      setTitle(existingTask.title);
      setDescription(existingTask.description ?? '');
      setPriority(existingTask.priority);
      setDueDate(existingTask.dueDate ? existingTask.dueDate.slice(0, 10) : '');
    }
  }, [existingTask]);

  const createMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? taskApi.update(id!, {
            employeeId,
            title,
            description: description || undefined,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          })
        : taskApi.create({
            employeeId,
            title,
            description: description || undefined,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/gorevler');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = Boolean(employeeId && title);

  return (
    <div className="space-y-4">
      <PageHeader
        title={isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}
        description={isEdit ? 'Mevcut görev bilgilerini güncelleyin' : 'Personele atanacak görevi detaylandırın'}
        actions={
          <Link to="/gorevler" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>Görev Detayları</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Görev Başlığı *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Yıllık bütçe raporunun hazırlanması" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Açıklama</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görevin içeriği, gereksinimler, referanslar..."
            />
          </div>

          <div className="space-y-2">
            <Label>Atanacak Personel *</Label>
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

          <div className="space-y-2">
            <Label>Öncelik</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {Object.entries(TASK_PRIORITY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bitiş Tarihi (Termin)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/gorevler" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Save /> {createMutation.isPending ? (isEdit ? 'Güncelleniyor…' : 'Oluşturuluyor…') : (isEdit ? 'Güncelle' : 'Görevi Ata')}
        </Button>
      </div>
    </div>
  );
}
