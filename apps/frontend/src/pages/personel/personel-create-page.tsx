import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Save, User, Building2, Phone } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { employeesApi } from '@/features/personel/api';
import { orgApi, type OrgGroup } from '@/features/organizasyon/api';
import { accessApi, type Role } from '@/features/erişim/api';
import { cn, formatError } from '@/lib/utils';

const schema = z
  .object({
    accountEnabled: z.boolean(),
    username: z.string().min(3, 'En az 3 karakter').optional().or(z.literal('')),
    password: z.string().min(6, 'En az 6 karakter').optional().or(z.literal('')),
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
  accountEnabled: false,
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

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn('text-sm font-medium', error ? 'text-destructive' : 'text-foreground/90')}>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive animate-fade-in">{error}</p>}
    </div>
  );
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
          ? { username: values.username!, password: values.password!, roleIds: values.roleIds.length ? values.roleIds : undefined }
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
    <div className="animate-fade-in pb-24 relative max-w-5xl mx-auto">
      <PageHeader
        title="Yeni Personel"
        description="Personel özlük bilgileri, görev yerleşimi ve hesap yetkileri."
        className="mb-8"
        actions={
          <Link to="/personel" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* ── Section 1: Personal Info ──────────────────── */}
        <Card className="border-border/60 shadow-[var(--shadow-xs)]">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <CardTitle className="text-lg">Kişisel Bilgiler</CardTitle>
            </div>
            <CardDescription>Personelin temel kimlik ve iletişim bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-6 pt-6 md:grid-cols-2 lg:grid-cols-3">
            <FormField label="Ad *" error={errors.firstName?.message}>
              <Input placeholder="Örn: Ahmet" {...register('firstName')} />
            </FormField>
            
            <FormField label="Soyad *" error={errors.lastName?.message}>
              <Input placeholder="Örn: Yılmaz" {...register('lastName')} />
            </FormField>
            
            <FormField label="TC Kimlik No">
              <Input placeholder="11 Haneli TC No" {...register('identityNo')} />
            </FormField>
            
            <FormField label="E-posta" error={errors.email?.message}>
              <Input type="email" placeholder="ahmet@kurum.com" {...register('email')} />
            </FormField>
            
            <FormField label="Kişisel Telefon">
              <Input placeholder="05XX XXX XX XX" {...register('phone')} />
            </FormField>
            
            <FormField label="İşe Başlama Tarihi">
              <Input type="date" {...register('workStartDate')} />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section 2: Corporate Info ──────────────────── */}
        <Card className="border-border/60 shadow-[var(--shadow-xs)]">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <CardTitle className="text-lg">Kurumsal Yerleşim</CardTitle>
            </div>
            <CardDescription>Departman, unvan ve dahili erişim ayarları</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-6 pt-6 md:grid-cols-2 lg:grid-cols-3">
            <FormField label="Sicil No">
              <Input placeholder="Örn: 2023-001" {...register('employeeNo')} />
            </FormField>

            <FormField label="Durum">
              <Select {...register('status')}>
                <option value="ACTIVE">Aktif (Çalışıyor)</option>
                <option value="PASSIVE">Pasif (Ayrıldı)</option>
                <option value="SUSPENDED">Askıda (İzinde/Uzaklaştırma)</option>
              </Select>
            </FormField>

            <div className="hidden lg:block" /> {/* Spacer */}

            <FormField label="Departman">
              <Select {...register('departmentId')}>
                <option value="">Seçiniz</option>
                {departments.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Birim">
              <Select {...register('unitId')}>
                <option value="">Seçiniz</option>
                {units.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Görev Yeri">
              <Select {...register('workLocationId')}>
                <option value="">Seçiniz</option>
                {locations.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Unvan">
              <Select {...register('titleId')}>
                <option value="">Seçiniz</option>
                {titles.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Görev / Pozisyon">
              <Select {...register('positionId')}>
                <option value="">Seçiniz</option>
                {positions.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </FormField>

            <div className="col-span-full mt-4 grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3 pt-6 border-t border-border/40">
              <div className="col-span-full">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Phone className="size-4" /> Kurum İçi İletişim
                </h4>
              </div>
              <FormField label="Dahili Telefon">
                <Input placeholder="Örn: 101" {...register('internalPhone')} />
              </FormField>
              <FormField label="Dış Hat">
                <Input placeholder="Örn: 0212 555 55 55" {...register('externalLine')} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Account & Access ───────────────── */}
        <Card className={cn(
          'border-border/60 shadow-[var(--shadow-xs)] transition-colors duration-300',
          accountEnabled && 'border-primary/40 ring-1 ring-primary/20'
        )}>
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <CardTitle className="text-lg">Kullanıcı Hesabı & Yetkiler</CardTitle>
            </div>
            <CardDescription>Sisteme giriş izni ve rol atamaları</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <label className="flex items-center gap-3 cursor-pointer group w-max">
              <Checkbox
                checked={accountEnabled}
                onChange={(e) => setValue('accountEnabled', e.target.checked)}
                className="scale-110"
              />
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                Kullanıcı hesabı oluştur (Sisteme giriş yapabilir)
              </span>
            </label>

            {accountEnabled && (
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 animate-fade-in p-4 rounded-xl bg-accent/30 border border-border/50">
                <FormField label="Kullanıcı Adı" error={errors.username?.message}>
                  <Input placeholder="Sisteme giriş adı" {...register('username')} />
                </FormField>
                
                <FormField label="Şifre" error={errors.password?.message}>
                  <Input type="password" placeholder="En az 6 karakter" {...register('password')} />
                </FormField>
                
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-sm font-medium">Uygulama Rolleri</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {roles?.map((role: Role) => {
                      const isSelected = roleIds.includes(role.id);
                      return (
                        <label
                          key={role.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 select-none hover:shadow-sm',
                            isSelected 
                              ? 'border-primary bg-primary/10 text-primary font-medium' 
                              : 'border-border bg-card text-foreground hover:border-border/80'
                          )}
                        >
                          <Checkbox checked={isSelected} onChange={() => toggleRole(role.id)} />
                          {role.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Sticky Bottom Action Bar ───────────────────── */}
        <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-40 bg-background/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1">
              {serverError && (
                <p className="text-sm font-medium text-destructive animate-fade-in">
                  {serverError}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Link to="/personel" className={buttonVariants({ variant: 'ghost' })}>
                Vazgeç
              </Link>
              <Button type="submit" size="lg" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting ? (
                  <>Kaydediliyor…</>
                ) : (
                  <>
                    <Save /> Personeli Kaydet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}