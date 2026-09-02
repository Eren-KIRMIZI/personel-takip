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
import { assetApi } from '@/features/zimmet/api';
import { formatError } from '@/lib/utils';

export function ZimmetCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      assetApi.create({
        employeeId,
        name,
        category: category || undefined,
        serialNo: serialNo || undefined,
        assignedDate: assignedDate ? new Date(assignedDate).toISOString() : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      navigate('/zimmet');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = Boolean(employeeId && name);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni Zimmet Kaydı"
        description="Personele verilecek zimmetli malzemeyi kaydedin"
        actions={
          <Link to="/zimmet" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>Zimmet Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Personel *</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Seçin…</option>
              {employees?.items.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                  {emp.employeeNo ? ` (${emp.employeeNo})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Malzeme Adı (Marka, Model vb.) *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Lenovo ThinkPad T14" />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Seçin…</option>
              <option value="BILGISAYAR">Bilgisayar / Laptop</option>
              <option value="TELEFON">Cep Telefonu / Tablet</option>
              <option value="ARAC">Araç</option>
              <option value="DIGER">Diğer Ekipman</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Seri No / Plaka</Label>
            <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Teslim Tarihi</Label>
            <Input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/zimmet" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Save /> {createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}
