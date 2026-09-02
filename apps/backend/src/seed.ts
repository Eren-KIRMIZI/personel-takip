/**
 * Veritabanı tohumlama scripti:
 *  1. Yetki (permission) kataloğunu oluşturur
 *  2. Admin rolüne tüm yetkileri atar
 *  3. Örnek kurum verisi (departman, birim, görev yeri, unvan, pozisyon)
 *  4. ADMIN_EMAIL/ADMIN_PASSWORD tanımlıysa Supabase Auth + admin kullanıcısı oluşturur
 *
 * Çalıştırma: npm run seed --workspace @personel-takip/backend
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';

// Root .env yükle (workspace içinden koşarken cwd = apps/backend)
import { config } from 'dotenv';
config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ module: string; code: string; name: string; description?: string }> = [
  // Personel
  { module: 'personel', code: 'employee:read', name: 'Personel görüntüleme' },
  { module: 'personel', code: 'employee:write', name: 'Personel ekleme/düzenleme' },
  { module: 'personel', code: 'employee:delete', name: 'Personel silme' },
  // İzin
  { module: 'izin', code: 'leave:read', name: 'İzin görüntüleme' },
  { module: 'izin', code: 'leave:create', name: 'İzin talebi oluşturma' },
  { module: 'izin', code: 'leave:approve', name: 'İzin onaylama' },
  { module: 'izin', code: 'leave:reject', name: 'İzin reddetme' },
  { module: 'izin', code: 'leave:write', name: 'İzin tipi yönetimi' },
  // Mesai
  { module: 'mesai', code: 'overtime:read', name: 'Mesai görüntüleme' },
  { module: 'mesai', code: 'overtime:create', name: 'Mesai tanımlama' },
  { module: 'mesai', code: 'overtime:approve', name: 'Mesai onaylama' },
  { module: 'mesai', code: 'overtime:reject', name: 'Mesai reddetme' },
  // Maaş / ödeme
  { module: 'maas', code: 'payroll:read', name: 'Maaş görüntüleme' },
  { module: 'maas', code: 'payroll:write', name: 'Maaş düzenleme' },
  { module: 'maas', code: 'payroll:approve', name: 'Bordro onaylama' },
  // Avans
  { module: 'avans', code: 'advance:read', name: 'Avans görüntüleme' },
  { module: 'avans', code: 'advance:write', name: 'Avans talebi oluşturma' },
  { module: 'avans', code: 'advance:approve', name: 'Avans onaylama' },
  // Ceza / Ödül
  { module: 'personel', code: 'employee-record:read', name: 'Ceza/Ödül görüntüleme' },
  { module: 'personel', code: 'employee-record:write', name: 'Ceza/Ödül ekleme/düzenleme' },
  { module: 'personel', code: 'employee-record:delete', name: 'Ceza/Ödül silme' },
  // Görev
  { module: 'görev', code: 'task:read', name: 'Görev görüntüleme' },
  { module: 'görev', code: 'task:create', name: 'Görev oluşturma' },
  { module: 'görev', code: 'task:assign', name: 'Görev atama' },
  // Zimmet
  { module: 'zimmet', code: 'asset:read', name: 'Zimmet görüntüleme' },
  { module: 'zimmet', code: 'asset:write', name: 'Zimmet ekleme' },
  { module: 'zimmet', code: 'asset:return', name: 'Zimmet iade alma' },
  // Evrak
  { module: 'evrak', code: 'document:read', name: 'Evrak görüntüleme' },
  { module: 'evrak', code: 'document:create', name: 'Evrak oluşturma' },
  // Duyuru
  { module: 'duyuru', code: 'announcement:create', name: 'Duyuru oluşturma' },
  { module: 'duyuru', code: 'announcement:publish', name: 'Duyuru yayınlama' },
  // Rapor
  { module: 'rapor', code: 'report:view', name: 'Rapor görüntüleme' },
  { module: 'rapor', code: 'report:create', name: 'Rapor oluşturma' },
  { module: 'rapor', code: 'report:export', name: 'Rapor dışa aktarma' },
  // Giriş-çıkış / QR
  { module: 'puantaj', code: 'attendance:read', name: 'Giriş-çıkış görüntüleme' },
  { module: 'puantaj', code: 'attendance:write', name: 'Giriş-çıkış düzenleme' },
  { module: 'qr', code: 'qr:read', name: 'QR görüntüleme' },
  { module: 'qr', code: 'qr:write', name: 'QR yönetimi' },
  { module: 'qr', code: 'qr:report', name: 'QR raporlama' },
  // Vardiya
  { module: 'vardiya', code: 'shift:read', name: 'Vardiya görüntüleme' },
  { module: 'vardiya', code: 'shift:write', name: 'Vardiya ve atama düzenleme' },
  // Organizasyon
  { module: 'organizasyon', code: 'company:read', name: 'Kurum görüntüleme' },
  { module: 'organizasyon', code: 'company:write', name: 'Kurum düzenleme' },
  { module: 'organizasyon', code: 'department:read', name: 'Departman görüntüleme' },
  { module: 'organizasyon', code: 'department:write', name: 'Departman düzenleme' },
  { module: 'organizasyon', code: 'unit:read', name: 'Birim görüntüleme' },
  { module: 'organizasyon', code: 'unit:write', name: 'Birim düzenleme' },
  { module: 'organizasyon', code: 'location:read', name: 'Görev yeri görüntüleme' },
  { module: 'organizasyon', code: 'location:write', name: 'Görev yeri düzenleme' },
  { module: 'organizasyon', code: 'title:read', name: 'Unvan görüntüleme' },
  { module: 'organizasyon', code: 'title:write', name: 'Unvan düzenleme' },
  { module: 'organizasyon', code: 'position:read', name: 'Pozisyon görüntüleme' },
  { module: 'organizasyon', code: 'position:write', name: 'Pozisyon düzenleme' },
  // Erişim / denetim
  { module: 'erişim', code: 'role:read', name: 'Rol görüntüleme' },
  { module: 'erişim', code: 'role:write', name: 'Rol düzenleme' },
  { module: 'erişim', code: 'user:read', name: 'Kullanıcı görüntüleme' },
  { module: 'erişim', code: 'user:write', name: 'Kullanıcı düzenleme' },
  { module: 'denetim', code: 'audit:read', name: 'İşlem loglarını görüntüleme' },
];

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, description: p.description ?? null },
      create: { ...p, description: p.description ?? null },
    });
  }
  const all = await prisma.permission.findMany();
  console.log(`✓ ${all.length} yetki hazır.`);
  return all;
}

async function seedAdminRole(all: Array<{ id: string }>) {
  const role = await prisma.role.upsert({
    where: { code: 'admin' },
    update: { isSystem: true, isActive: true },
    create: { name: 'Admin', code: 'admin', description: 'Tüm yetkilere sahip sistem rolü', isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: all.map((p) => ({ roleId: role.id, permissionId: p.id })),
  });
  console.log('✓ admin rolüne tüm yetkiler atandı.');
  return role;
}

async function seedOrganization() {
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Örnek Belediye',
      shortName: 'OB',
      address: 'Atatürk Cd. No:1',
    },
  });

  const departmentNames = ['Evlendirme Müdürlüğü', 'Mezarlıklar Müdürlüğü', 'Fen İşleri', 'Park ve Bahçeler'];
  for (const name of departmentNames) {
    const dept = await prisma.department.findFirst({ where: { name, companyId: company.id } });
    if (dept) continue;
    await prisma.department.create({ data: { name, companyId: company.id } });
  }

  const lokasyon = await prisma.workLocation.findFirst({ where: { name: 'Merkez Yerleşke' } });
  if (!lokasyon) {
    await prisma.workLocation.create({
      data: { name: 'Merkez Yerleşke', code: 'MERK', address: 'Ana bina' },
    });
  }

  for (const name of ['Genel Müdür', 'Müdür', 'Şef', 'Memur', 'İşçi']) {
    const existing = await prisma.title.findFirst({ where: { name } });
    if (!existing) await prisma.title.create({ data: { name } });
  }

  for (const name of ['Müdür', 'Koordinatör', 'Uzman', 'Operatör', 'Saha Personeli']) {
    const existing = await prisma.position.findFirst({ where: { name } });
    if (!existing) await prisma.position.create({ data: { name } });
  }

  console.log('✓ Örnek organizasyon verisi hazır.');
}

async function seedLeaveTypes() {
  const types = [
    { name: 'Yıllık İzin', code: 'annual', paid: true, color: '#16a34a', defaultDays: 14 },
    { name: 'Mazeret İzni', code: 'personal', paid: true, color: '#2563eb', defaultDays: 3 },
    { name: 'Hastalık Raporu', code: 'sick', paid: true, color: '#dc2626', defaultDays: 5 },
    { name: 'Ücretsiz İzin', code: 'unpaid', paid: false, color: '#6b7280', defaultDays: null },
  ];
  for (const t of types) {
    await prisma.leaveType.upsert({
      where: { code: t.code },
      update: { name: t.name, paid: t.paid, color: t.color, defaultDays: t.defaultDays },
      create: t,
    });
  }
  console.log('✓ Varsayılan izin tipleri hazır.');
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('ℹ ADMIN_EMAIL/ADMIN_PASSWORD tanımlanmadı; admin kullanıcı oluşturulmadı.');
    return;
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('ℹ Admin kullanıcı zaten var, atlanıyor.');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('⚠ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY eksik; Supabase Auth kullanıcısı oluşturulamadı.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: process.env.ADMIN_NAME ?? 'Admin' },
  });
  if (error) {
    console.warn(`⚠ Supabase Auth kullanıcısı oluşturulamadı: ${error.message}`);
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
  await prisma.user.create({
    data: {
      authId: data.user.id,
      username: process.env.ADMIN_USERNAME ?? email.split('@')[0] ?? 'admin',
      email,
      status: 'ACTIVE',
      roles: { create: [{ roleId: adminRole.id }] },
    },
  });
  console.log(`✓ Admin kullanıcı oluşturuldu: ${email}`);
}

async function main() {
  const all = await seedPermissions();
  await seedAdminRole(all);
  await seedOrganization();
  await seedLeaveTypes();
  await seedAdminUser();
  console.log('Tohumlama tamamlandı.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());