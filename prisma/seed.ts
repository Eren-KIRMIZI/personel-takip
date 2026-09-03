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

// ── Tüm izinler (apps/backend/src/seed.ts ile senkron) ─────────────────────
const ALL_PERMISSIONS = [
  // Personel
  { code: 'employee:read', name: 'Personel görüntüleme', module: 'personel' },
  { code: 'employee:write', name: 'Personel ekleme/düzenleme', module: 'personel' },
  { code: 'employee:delete', name: 'Personel silme', module: 'personel' },
  // İzin
  { code: 'leave:read', name: 'İzin görüntüleme', module: 'izin' },
  { code: 'leave:create', name: 'İzin talebi oluşturma', module: 'izin' },
  { code: 'leave:approve', name: 'İzin onaylama', module: 'izin' },
  { code: 'leave:reject', name: 'İzin reddetme', module: 'izin' },
  { code: 'leave:write', name: 'İzin tipi yönetimi', module: 'izin' },
  // Mesai
  { code: 'overtime:read', name: 'Mesai görüntüleme', module: 'mesai' },
  { code: 'overtime:create', name: 'Mesai tanımlama', module: 'mesai' },
  { code: 'overtime:approve', name: 'Mesai onaylama', module: 'mesai' },
  { code: 'overtime:reject', name: 'Mesai reddetme', module: 'mesai' },
  // Maaş
  { code: 'payroll:read', name: 'Maaş görüntüleme', module: 'maas' },
  { code: 'payroll:write', name: 'Maaş düzenleme', module: 'maas' },
  { code: 'payroll:approve', name: 'Bordro onaylama', module: 'maas' },
  // Avans
  { code: 'advance:read', name: 'Avans görüntüleme', module: 'avans' },
  { code: 'advance:write', name: 'Avans talebi oluşturma', module: 'avans' },
  { code: 'advance:approve', name: 'Avans onaylama', module: 'avans' },
  // Prim
  { code: 'bonus:read', name: 'Prim görüntüleme', module: 'prim' },
  { code: 'bonus:write', name: 'Prim ekleme/düzenleme', module: 'prim' },
  { code: 'bonus:approve', name: 'Prim onaylama', module: 'prim' },
  // Disiplin ve Teşvik
  { code: 'employee-record:read', name: 'Disiplin ve Teşvik görüntüleme', module: 'personel' },
  { code: 'employee-record:write', name: 'Disiplin ve Teşvik ekleme/düzenleme', module: 'personel' },
  { code: 'employee-record:delete', name: 'Disiplin ve Teşvik silme', module: 'personel' },
  // Zimmet
  { code: 'asset:read', name: 'Zimmet görüntüleme', module: 'zimmet' },
  { code: 'asset:write', name: 'Zimmet ekleme/düzenleme', module: 'zimmet' },
  { code: 'asset:return', name: 'Zimmet iade alma', module: 'zimmet' },
  { code: 'asset:delete', name: 'Zimmet silme', module: 'zimmet' },
  // Görev
  { code: 'task:read', name: 'Görev görüntüleme', module: 'görev' },
  { code: 'task:write', name: 'Görev oluşturma/düzenleme', module: 'görev' },
  { code: 'task:create', name: 'Görev oluşturma', module: 'görev' },
  { code: 'task:assign', name: 'Görev atama', module: 'görev' },
  // Evrak
  { code: 'document:read', name: 'Evrak görüntüleme', module: 'evrak' },
  { code: 'document:write', name: 'Evrak oluşturma/düzenleme', module: 'evrak' },
  { code: 'document:create', name: 'Evrak oluşturma', module: 'evrak' },
  // Duyuru
  { code: 'announcement:read', name: 'Duyuru görüntüleme', module: 'duyuru' },
  { code: 'announcement:write', name: 'Duyuru oluşturma/düzenleme', module: 'duyuru' },
  { code: 'announcement:create', name: 'Duyuru oluşturma', module: 'duyuru' },
  { code: 'announcement:publish', name: 'Duyuru yayınlama', module: 'duyuru' },
  // Bildirim
  { code: 'notification:read', name: 'Bildirim görüntüleme', module: 'bildirim' },
  // Rapor
  { code: 'report:view', name: 'Rapor görüntüleme', module: 'rapor' },
  { code: 'report:create', name: 'Rapor oluşturma', module: 'rapor' },
  { code: 'report:export', name: 'Rapor dışa aktarma', module: 'rapor' },
  // Giriş-çıkış
  { code: 'attendance:read', name: 'Giriş-çıkış görüntüleme', module: 'puantaj' },
  { code: 'attendance:write', name: 'Giriş-çıkış düzenleme', module: 'puantaj' },
  // QR
  { code: 'qr:read', name: 'QR görüntüleme', module: 'qr' },
  { code: 'qr:write', name: 'QR yönetimi', module: 'qr' },
  { code: 'qr:report', name: 'QR raporlama', module: 'qr' },
  // Vardiya
  { code: 'shift:read', name: 'Vardiya görüntüleme', module: 'vardiya' },
  { code: 'shift:write', name: 'Vardiya ve atama düzenleme', module: 'vardiya' },
  // Organizasyon
  { code: 'company:read', name: 'Kurum görüntüleme', module: 'organizasyon' },
  { code: 'company:write', name: 'Kurum düzenleme', module: 'organizasyon' },
  { code: 'department:read', name: 'Departman görüntüleme', module: 'organizasyon' },
  { code: 'department:write', name: 'Departman düzenleme', module: 'organizasyon' },
  { code: 'unit:read', name: 'Birim görüntüleme', module: 'organizasyon' },
  { code: 'unit:write', name: 'Birim düzenleme', module: 'organizasyon' },
  { code: 'location:read', name: 'Görev yeri görüntüleme', module: 'organizasyon' },
  { code: 'location:write', name: 'Görev yeri düzenleme', module: 'organizasyon' },
  { code: 'title:read', name: 'Unvan görüntüleme', module: 'organizasyon' },
  { code: 'title:write', name: 'Unvan düzenleme', module: 'organizasyon' },
  { code: 'position:read', name: 'Pozisyon görüntüleme', module: 'organizasyon' },
  { code: 'position:write', name: 'Pozisyon düzenleme', module: 'organizasyon' },
  // Erişim
  { code: 'role:read', name: 'Rol görüntüleme', module: 'erişim' },
  { code: 'role:write', name: 'Rol düzenleme', module: 'erişim' },
  { code: 'user:read', name: 'Kullanıcı görüntüleme', module: 'erişim' },
  { code: 'user:write', name: 'Kullanıcı düzenleme', module: 'erişim' },
  // Denetim
  { code: 'audit:read', name: 'İşlem loglarını görüntüleme', module: 'denetim' },
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
      code: 'admin',
      description: 'Sisteme tam erişim yetkisi',
      isSystem: true,
      permissions: ALL_PERMISSIONS.map((p) => p.code), // HEPSİ
    },
    {
      name: 'Birim Yöneticisi',
      code: 'unit_manager',
      description: 'Kendi birimine ait personel/izin/mesai yönetimi',
      isSystem: false,
      permissions: [
        'employee:read',
        'leave:read', 'leave:approve', 'leave:reject',
        'overtime:read', 'overtime:approve', 'overtime:reject',
        'attendance:read',
        'shift:read', 'shift:write',
        'task:read', 'task:write', 'task:assign',
        'document:read',
        'announcement:read',
        'report:view',
        'company:read', 'department:read', 'unit:read',
      ],
    },
    {
      name: 'İK Uzmanı',
      code: 'hr_specialist',
      description: 'İnsan kaynakları süreçlerini yöneten uzman',
      isSystem: false,
      permissions: [
        'employee:read', 'employee:write',
        'leave:read', 'leave:create', 'leave:approve', 'leave:reject', 'leave:write',
        'overtime:read', 'overtime:create', 'overtime:approve', 'overtime:reject',
        'payroll:read', 'payroll:write',
        'bonus:read', 'bonus:write', 'bonus:approve',
        'advance:read', 'advance:write', 'advance:approve',
        'attendance:read', 'attendance:write',
        'shift:read', 'shift:write',
        'task:read', 'task:write',
        'asset:read',
        'document:read', 'document:write',
        'announcement:read', 'announcement:write',
        'report:view', 'report:export',
        'company:read', 'department:read', 'unit:read',
        'audit:read',
      ],
    },
    {
      name: 'Standart Personel',
      code: 'employee',
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
    roleCode: 'unit_manager',
    title: 'Birim Yöneticisi',
  },
  {
    email: 'ik@belediye.local',
    password: 'Test1234!',
    username: 'ik.uzmani',
    firstName: 'Ayşe',
    lastName: 'Kaya',
    roleCode: 'hr_specialist',
    title: 'İK Uzmanı',
  },
  {
    email: 'personel@belediye.local',
    password: 'Test1234!',
    username: 'personel',
    firstName: 'Ali',
    lastName: 'Demir',
    roleCode: 'employee',
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
