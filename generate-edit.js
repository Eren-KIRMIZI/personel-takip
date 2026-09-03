const fs = require('fs');
let content = fs.readFileSync('apps/frontend/src/pages/personel/personel-create-page.tsx', 'utf8');

content = content.replace(/PersonelCreatePage/g, 'PersonelEditPage');
content = content.replace(/Yeni Personel/g, 'Personel Düzenle');
content = content.replace(/Personeli Kaydet/g, 'Değişiklikleri Kaydet');

content = content.replace(/import \{ useState \} from 'react';/, 'import { useState, useEffect } from "react";\nimport { useParams } from "react-router-dom";');
content = content.replace(/const navigate = useNavigate\(\);/, 'const { id } = useParams<{ id: string }>();\n  const navigate = useNavigate();');

const queryCode = `
  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (employee) {
      setValue('firstName', employee.firstName);
      setValue('lastName', employee.lastName);
      setValue('identityNo', employee.identityNo || '');
      setValue('email', employee.email || '');
      setValue('phone', employee.phone || '');
      setValue('workStartDate', employee.workStartDate ? employee.workStartDate.split('T')[0] : '');
      setValue('employeeNo', employee.employeeNo || '');
      setValue('status', employee.status);
      setValue('departmentId', employee.department?.id || '');
      setValue('unitId', employee.unit?.id || '');
      setValue('workLocationId', employee.workLocation?.id || '');
      setValue('titleId', employee.title?.id || '');
      setValue('positionId', employee.position?.id || '');
      setValue('internalPhone', employee.internalPhone || '');
      setValue('externalLine', employee.externalLine || '');
      if (employee.user) {
        setValue('accountEnabled', true);
        setValue('accountEmail', employee.user.email || '');
        setValue('roleIds', employee.user.roles.map((r: any) => r.role.id));
      }
    }
  }, [employee, setValue]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      employeesApi.update(id!, {
        account: values.accountEnabled && values.accountEmail
          ? { username: values.accountEmail.split('@')[0] ?? values.accountEmail, email: values.accountEmail, password: values.password || undefined, roleIds: values.roleIds.length ? values.roleIds : undefined }
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
        workStartDate: values.workStartDate ? new Date(values.workStartDate).toISOString() : undefined,
      }),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['employee', id] });
      navigate(\`/personel/\${employee.id}\`);
    },
  });
`;

content = content.replace(/const createMutation = useMutation\(\{[\s\S]*?\}\);/, queryCode);
content = content.replace(/createMutation\.mutate/g, 'updateMutation.mutate');
content = content.replace(/createMutation\.isPending/g, 'updateMutation.isPending');

// Disable password validation if editing and password is empty (backend should ignore empty password on update)
content = content.replace(/if \(\!data\.password\)/, 'if (!data.password && false)'); // dirty hack for now

fs.writeFileSync('apps/frontend/src/pages/personel/personel-edit-page.tsx', content);
