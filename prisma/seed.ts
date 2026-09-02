/**
 * Seed Script — Mevcut veriyi BOZMADAN sadece eksik olanları ekler.
 * Çalıştırmak için: npx ts-node --project tsconfig.seed.json prisma/seed.ts
 *
 * Oluşturulan test hesapları:
 *  yonetici@belediye.local  / Test1234!   → Birim Yöneticisi
 *  ik@belediye.local        / Test1234!   → İK Uzmanı
 *  personel@belediye.local  / Test1234!   → Standart Personel
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Tüm izinler ────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  // Personel
  { code: 'employee:read', name: 'Personel Görüntüle', module: 'employees' },
  { code: 'employee:write', name: 'Personel Yönet', module: 'employees' },
  { code: 'employee:delete', name: 'Personel Sil', module: 'employees' },
  // İzin
  { code: 'leave:read', name: 'İzin Görüntüle', module: 'leave' },
  { code: 'leave:create', name: 'İzin Talebi Oluştur', module: 'leave' },
  { code: 'leave:approve', name: 'İzin Onayla', module: 'leave' },
  { code: 'leave:reject', name: 'İzin Reddet', module: 'leave' },
  // Mesai
  { code: 'overtime:read', name: 'Mesai Görüntüle', module: 'overtime' },
  { code: 'overtime:create', name: 'Mesai Ekle', module: 'overtime' },
  { code: 'overtime:approve', name: 'Mesai Onayla', module: 'overtime' },
  { code: 'overtime:reject', name: 'Mesai Reddet', module: 'overtime' },
  // Maaş
  { code: 'payroll:read', name: 'Maaş Görüntüle', module: 'payroll' },
  { code: 'payroll:write', name: 'Maaş Yönet', module: 'payroll' },
  { code: 'payroll:approve', name: 'Maaş Onayla', module: 'payroll' },
  // Prim
  { code: 'bonus:read', name: 'Prim Görüntüle', module: 'bonus' },
  { code: 'bonus:write', name: 'Prim Yönet', module: 'bonus' },
  // Avans
  { code: 'advance:read', name: 'Avans Görüntüle', module: 'advance' },
  { code: 'advance:write', name: 'Avans Yönet', module: 'advance' },
  { code: 'advance:approve', name: 'Avans Onayla', module: 'advance' },
  // Giriş-Çıkış
  { code: 'attendance:read', name: 'Puantaj Görüntüle', module: 'attendance' },
  { code: 'attendance:write', name: 'Puantaj Yönet', module: 'attendance' },
  { code: 'qr:read', name: 'QR Görüntüle', module: 'attendance' },
  { code: 'qr:write', name: 'QR Yönet', module: 'attendance' },
  // Vardiya
  { code: 'shift:read', name: 'Vardiya Görüntüle', module: 'shift' },
  { code: 'shift:write', name: 'Vardiya Yönet', module: 'shift' },
  { code: 'shift:assign', name: 'Vardiya Ata', module: 'shift' },
  // Görev
  { code: 'task:read', name: 'Görev Görüntüle', module: 'task' },
  { code: 'task:write', name: 'Görev Yönet', module: 'task' },
  // Zimmet
  { code: 'asset:read', name: 'Zimmet Görüntüle', module: 'asset' },
  { code: 'asset:write', name: 'Zimmet Yönet', module: 'asset' },
  { code: 'asset:return', name: 'Zimmet İade Al', module: 'asset' },
  // Evrak
  { code: 'document:read', name: 'Evrak Görüntüle', module: 'document' },
  { code: 'document:write', name: 'Evrak Yönet', module: 'document' },
  // Duyuru
  { code: 'announcement:read', name: 'Duyuru Görüntüle', module: 'announcement' },
  { code: 'announcement:write', name: 'Duyuru Yönet', module: 'announcement' },
  // Raporlar
  { code: 'report:read', name: 'Rapor Görüntüle', module: 'reports' },
  { code: 'report:export', name: 'Rapor Dışa Aktar', module: 'reports' },
  // Organizasyon
  { code: 'organization:read', name: 'Organizasyon Görüntüle', module: 'organization' },
  { code: 'organization:write', name: 'Organizasyon Yönet', module: 'organization' },
  // Erişim / Roller
  { code: 'access:read', name: 'Rol Yetki Görüntüle', module: 'access' },
  { code: 'access:write', name: 'Rol Yetki Yönet', module: 'access' },
  // Loglar
  { code: 'audit:read', name: 'Logları Görüntüle', module: 'audit' },
];

// ── Rol tanımları: hangi rol hangi izinlere sahip ──────────────────────────
const ROLES: Array<{
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  permissions: string[]; // permission code listesi
}> = [
    {
      name: 'Admin',
      code: 'ADMIN',
      description: 'Sisteme tam erişim yetkisi',
      isSystem: true,
      permissions: ALL_PERMISSIONS.map((p) => p.code), // HEPSİ
    },
    {
      name: 'Birim Yöneticisi',
      code: 'UNIT_MANAGER',
      description: 'Kendi birimine ait personel/izin/mesai yönetimi',
      isSystem: false,
      permissions: [
        'employee:read',
        'leave:read', 'leave:approve', 'leave:reject',
        'overtime:read', 'overtime:approve', 'overtime:reject',
        'attendance:read',
        'shift:read', 'shift:assign',
        'task:read', 'task:write',
        'document:read',
        'announcement:read',
        'report:read',
        'organization:read',
      ],
    },
    {
      name: 'İK Uzmanı',
      code: 'HR_SPECIALIST',
      description: 'İnsan kaynakları süreçlerini yöneten uzman',
      isSystem: false,
      permissions: [
        'employee:read', 'employee:write',
        'leave:read', 'leave:create', 'leave:approve', 'leave:reject',
        'overtime:read', 'overtime:create', 'overtime:approve', 'overtime:reject',
        'payroll:read', 'payroll:write',
        'bonus:read', 'bonus:write',
        'advance:read', 'advance:write', 'advance:approve',
        'attendance:read', 'attendance:write',
        'shift:read', 'shift:write', 'shift:assign',
        'task:read', 'task:write',
        'asset:read',
        'document:read', 'document:write',
        'announcement:read', 'announcement:write',
        'report:read', 'report:export',
        'organization:read',
        'audit:read',
      ],
    },
    {
      name: 'Standart Personel',
      code: 'EMPLOYEE',
      description: 'Sadece kendi verilerine erişebilen personel',
      isSystem: false,
      permissions: [
        'leave:read', 'leave:create',
        'overtime:read', 'overtime:create',
        'payroll:read',
        'attendance:read',
        'task:read',
        'announcement:read',
        'document:read',
        'qr:read',
      ],
    },
  ];

// ── Test kullanıcıları ─────────────────────────────────────────────────────
const TEST_USERS = [
  {
    email: 'yonetici@belediye.local',
    password: 'Test1234!',
    username: 'yonetici',
    firstName: 'Mehmet',
    lastName: 'Yılmaz',
    roleCode: 'UNIT_MANAGER',
    title: 'Birim Yöneticisi',
  },
  {
    email: 'ik@belediye.local',
    password: 'Test1234!',
    username: 'ik.uzmani',
    firstName: 'Ayşe',
    lastName: 'Kaya',
    roleCode: 'HR_SPECIALIST',
    title: 'İK Uzmanı',
  },
  {
    email: 'personel@belediye.local',
    password: 'Test1234!',
    username: 'personel',
    firstName: 'Ali',
    lastName: 'Demir',
    roleCode: 'EMPLOYEE',
    title: 'Memur',
  },
];

// ── Yardımcı: Supabase Auth'ta kullanıcıyı bul ya da oluştur ──────────────
async function upsertSupabaseUser(email: string, password: string): Promise<string> {
  // Önce var mı diye bak
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  ↳ Supabase kullanıcısı zaten var: ${email}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Supabase kullanıcı oluşturulamadı (${email}): ${error.message}`);
  console.log(`  ↳ Supabase kullanıcısı oluşturuldu: ${email}`);
  return data.user.id;
}

// ── Ana seed fonksiyonu ────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Seed başlatılıyor...\n');

  // 1. Tüm izinleri upsert et
  console.log('1️⃣  İzinler oluşturuluyor...');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: { name: perm.name, module: perm.module },
    });
  }
  console.log(`   ✅ ${ALL_PERMISSIONS.length} izin hazır.\n`);

  // 2. Rolleri ve rol-izin bağlantılarını upsert et
  console.log('2️⃣  Roller oluşturuluyor...');
  for (const roleDef of ROLES) {
    const { permissions: permCodes, ...roleData } = roleDef;

    // code VEYA name ile eşleşen mevcut rolü bul (unique constraint çakışmasını önler)
    let role = await prisma.role.findUnique({ where: { code: roleData.code } });
    if (!role) {
      role = await prisma.role.findUnique({ where: { name: roleData.name } });
    }

    if (role) {
      // Mevcut rolü güncelle (code ve name dahil)
      role = await prisma.role.update({
        where: { id: role.id },
        data: { code: roleData.code, name: roleData.name, description: roleData.description, isSystem: roleData.isSystem },
      });
      console.log(`   🔄 Güncellendi: ${roleData.name}`);
    } else {
      role = await prisma.role.create({ data: roleData });
      console.log(`   ➕ Oluşturuldu: ${roleData.name}`);
    }

    // İzinleri ilişkilendir (mevcut bağlantıyı bozmaz)
    const perms = await prisma.permission.findMany({
      where: { code: { in: permCodes } },
      select: { id: true },
    });

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
    console.log(`   ✅ ${roleData.name} — ${permCodes.length} izin atandı`);
  }
  console.log('');

  // 3. Şirket var mı, yoksa oluştur
  console.log('3️⃣  Şirket kontrolü...');
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Test Belediyesi', shortName: 'Belediye' },
    });
    console.log('   ✅ Şirket oluşturuldu: Test Belediyesi');
  } else {
    console.log(`   ℹ️  Mevcut şirket kullanılıyor: ${company.name}`);
  }

  // 4. Test departmanı/birimi
  let department = await prisma.department.findFirst({ where: { companyId: company.id } });
  if (!department) {
    department = await prisma.department.create({
      data: { companyId: company.id, name: 'İnsan Kaynakları', code: 'IK' },
    });
    console.log('   ✅ Departman oluşturuldu: İnsan Kaynakları');
  } else {
    console.log(`   ℹ️  Mevcut departman kullanılıyor: ${department.name}`);
  }
  console.log('');

  // 5. Test kullanıcılarını oluştur
  console.log('4️⃣  Test kullanıcıları oluşturuluyor...');
  for (const u of TEST_USERS) {
    console.log(`\n  👤 ${u.firstName} ${u.lastName} (${u.email})`);

    // Supabase Auth
    const authId = await upsertSupabaseUser(u.email, u.password);

    // Prisma User kaydı
    let user = await prisma.user.findFirst({ where: { email: u.email } });
    if (!user) {
      // Önce Employee oluştur
      const employee = await prisma.employee.create({
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          departmentId: department.id,
          status: 'ACTIVE',
          workStartDate: new Date(),
        },
      });

      user = await prisma.user.create({
        data: {
          authId,
          username: u.username,
          email: u.email,
          employeeId: employee.id,
          status: 'ACTIVE',
        },
      });
      console.log(`  ↳ Kullanıcı oluşturuldu (DB).`);
    } else {
      // authId güncelle (eğer eksikse)
      if (!user.authId) {
        await prisma.user.update({ where: { id: user.id }, data: { authId } });
        console.log(`  ↳ Mevcut kullanıcı güncellendi (authId eklendi).`);
      } else {
        console.log(`  ↳ Kullanıcı zaten var (DB).`);
      }
    }

    // Rolü bul ve ata
    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (!role) throw new Error(`Rol bulunamadı: ${u.roleCode}`);

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
    console.log(`  ↳ Rol atandı: ${role.name}`);
  }

}

main()
  .catch((e) => { console.error('❌ Seed hatası:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
