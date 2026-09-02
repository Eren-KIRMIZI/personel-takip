import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { employeesApi } from '@/features/personel/api';
import { orgApi, type OrgGroup } from '@/features/organizasyon/api';
import { accessApi, type Role } from '@/features/erişim/api';
import { formatError } from '@/lib/utils';

const schema = z
  .object({
    accountEnabled: z.boolean(),
    username: z.string().min(3, 'En az 3 karakter'),
    password: z.string().min(6, 'En az 6 karakter'),
    firstName: z.string().min(2, 'Ad zorunlu'),
    lastName: z.string().min(2, 'Soyad zorunlu'),
    email: z.string().email('Geçerli e-posta girin').optional().or(z.literal('')),
    employeeNo: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    internalPhone: z.string().optional().or(z.literal('')),
    externalLine: z.string().optional().or(z.literal('')),
    identityNo: z.string().optional().or(z.literal('')),
    status: z.enum(['ACTIVE', 'PASSIVE', 'SUSPENDED']),
    departmentId: z.string().optional().or(z.literal('')),
    unitId: z.string().optional().or(z.literal('')),
    workLocationId: z.string().optional().or(z.literal('')),
    titleId: z.string().optional().or(z.literal('')),
    positionId: z.string().optional().or(z.literal('')),
    workStartDate: z.string().optional().or(z.literal('')),
    roleIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.accountEnabled) {
      if (!data.username) {
        ctx.addIssue({ code: 'custom', path: ['username'], message: 'Kullanıcı adı zorunlu' });
      }
      if (!data.password) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Şifre zorunlu' });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  accountEnabled: true,
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  employeeNo: '',
  phone: '',
  internalPhone: '',
  externalLine: '',
  identityNo: '',
  status: 'ACTIVE',
  departmentId: '',
  unitId: '',
  workLocationId: '',
  titleId: '',
  positionId: '',
  workStartDate: '',
  roleIds: [],
};

function useOptionList(group: OrgGroup, queryKey: string) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: () => orgApi.list(group, { pageSize: 500 }),
  });
}

export function PersonelCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const accountEnabled = watch('accountEnabled');
  const roleIds = watch('roleIds');

  const departments = useOptionList('departments', 'departments-all');
  const units = useOptionList('units', 'units-all');
  const locations = useOptionList('work-locations', 'locations-all');
  const titles = useOptionList('titles', 'titles-all');
  const positions = useOptionList('positions', 'positions-all');
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => accessApi.roles() });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      employeesApi.create({
        account: values.accountEnabled
          ? { username: values.username, password: values.password, roleIds: values.roleIds.length ? values.roleIds : undefined }
          : undefined,
        firstName: values.firstName,
        lastName: values.lastName,
        employeeNo: values.employeeNo || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        internalPhone: values.internalPhone || undefined,
        externalLine: values.externalLine || undefined,
        identityNo: values.identityNo || undefined,
        status: values.status,
        departmentId: values.departmentId || undefined,
        unitId: values.unitId || undefined,
        workLocationId: values.workLocationId || undefined,
        titleId: values.titleId || undefined,
        positionId: values.positionId || undefined,
        workStartDate: values.workStartDate || undefined,
      }),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/personel/${employee.id}`);
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    createMutation.mutate(values, {
      onError: (error) => setServerError(formatError(error)),
    });
  };

  const toggleRole = (roleId: string) => {
    const next = roleIds.includes(roleId) ? roleIds.filter((id) => id !== roleId) : [...roleIds, roleId];
    setValue('roleIds', next, { shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni Personel"
        description="Personel ve kullanıcı hesabı bilgileri"
        actions={
          <Link to="/personel" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Ad *</Label>
              <Input {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Soyad *</Label>
              <Input {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Sicil No</Label>
              <Input {...register('employeeNo')} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Kişisel Telefon</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>Dahili Telefon</Label>
              <Input {...register('internalPhone')} />
            </div>
            <div className="space-y-2">
              <Label>Dış Hat</Label>
              <Input {...register('externalLine')} />
            </div>
            <div className="space-y-2">
              <Label>TC Kimlik No</Label>
              <Input {...register('identityNo')} />
            </div>
            <div className="space-y-2">
              <Label>İşe Başlama Tarihi</Label>
              <Input type="date" {...register('workStartDate')} />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select {...register('status')}>
                <option value="ACTIVE">Aktif</option>
                <option value="PASSIVE">Pasif</option>
                <option value="SUSPENDED">Askıda</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Görev Yeri ve Unvan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Departman</Label>
              <Select {...register('departmentId')}>
                <option value="">Seçin</option>
                {departments.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Birim</Label>
              <Select {...register('unitId')}>
                <option value="">Seçin</option>
                {units.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Görev Yeri</Label>
              <Select {...register('workLocationId')}>
                <option value="">Seçin</option>
                {locations.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unvan</Label>
              <Select {...register('titleId')}>
                <option value="">Seçin</option>
                {titles.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Görev / Pozisyon</Label>
              <Select {...register('positionId')}>
                <option value="">Seçin</option>
                {positions.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Hesabı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={accountEnabled} onChange={(e) => setValue('accountEnabled', e.target.checked)} />
              Kullanıcı hesabı oluştur (sisteme giriş yapabilir)
            </label>
            {accountEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kullanıcı Adı</Label>
                  <Input {...register('username')} />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Şifre</Label>
                  <Input type="password" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Roller</Label>
                  <div className="flex flex-wrap gap-2">
                    {roles?.map((role: Role) => (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox checked={roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                        {role.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex justify-end gap-2">
          <Link to="/personel" className={buttonVariants({ variant: 'outline' })}>
            Vazgeç
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save /> {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
}