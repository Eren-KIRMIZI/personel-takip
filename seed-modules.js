'use strict';
/**
 * Eksiksiz mock veri seed betiği - tüm modülleri zengin verilerle doldurur.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dAgo    = (n) => { const x = new Date(); x.setDate(x.getDate() - n); x.setHours(9, 0, 0, 0); return x; };
const dFuture = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x; };
const rand    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function main() {
  console.log('▶️  Tüm modüller için mock veriler yükleniyor...\n');

  // Mevcut çalışan ve kullanıcıları çek
  const employees = await prisma.employee.findMany({
    include: { user: true },
    orderBy: { employeeNo: 'asc' },
  });

  if (employees.length === 0) {
    console.error('❌ Personel bulunamadı.');
    return;
  }

  const userMap = {};
  const salaries = {
    EMP001: 45000, EMP002: 32000, EMP003: 38000, EMP004: 36000,
    EMP005: 26000, EMP006: 25000, EMP007: 24000, EMP008: 24500,
    EMP009: 23000, EMP010: 23500, EMP011: 22000, EMP012: 22500
  };

  for (const emp of employees) {
    userMap[emp.employeeNo] = {
      emp,
      user: emp.user,
      salary: salaries[emp.employeeNo] || 25000
    };
  }

  const lts    = await prisma.leaveType.findMany();
  const ltMap  = {};
  for (const lt of lts) ltMap[lt.code] = lt;

  const locs   = await prisma.workLocation.findMany();
  const locMap = {};
  for (const l of locs) locMap[l.code] = l;

  const adminUser = userMap['EMP001']?.user; // Eren KIRMIZI
  console.log(`👤 Admin Kullanıcı: ${userMap['EMP001']?.emp?.firstName} ${userMap['EMP001']?.emp?.lastName} (${adminUser?.email})`);

  // 1. İZİN TALEPLERİ
  console.log('🏖️  İzin talepleri yükleniyor...');
  await prisma.leaveRequest.deleteMany({});
  const leaveRows = [
    { emp: 'EMP005', lt: 'annual',   sD: dAgo(20),    eD: dAgo(16),    status: 'APPROVED',  desc: 'Yıllık tatil izni' },
    { emp: 'EMP006', lt: 'sick',     sD: dAgo(12),    eD: dAgo(10),    status: 'APPROVED',  desc: 'Doktor raporu - mevsimsel grip' },
    { emp: 'EMP007', lt: 'personal', sD: dAgo(8),     eD: dAgo(7),     status: 'APPROVED',  desc: 'Aile ziyareti mazeret izni' },
    { emp: 'EMP008', lt: 'annual',   sD: dAgo(5),     eD: dAgo(3),     status: 'APPROVED',  desc: 'Yıllık izin kullanımı' },
    { emp: 'EMP009', lt: 'annual',   sD: dAgo(25),    eD: dAgo(18),    status: 'REJECTED',  desc: 'Şantiye acil iş yoğunluğu nedeniyle ertelendi' },
    { emp: 'EMP010', lt: 'sick',     sD: dAgo(15),    eD: dAgo(13),    status: 'APPROVED',  desc: 'Solunum yolu enfeksiyonu raporu' },
    { emp: 'EMP011', lt: 'personal', sD: dAgo(3),     eD: dAgo(2),     status: 'PENDING',   desc: 'Acil ailevi durum' },
    { emp: 'EMP012', lt: 'annual',   sD: dFuture(5),  eD: dFuture(12), status: 'PENDING',   desc: 'Yıllık izin planlaması' },
    { emp: 'EMP005', lt: 'annual',   sD: dFuture(20), eD: dFuture(27), status: 'PENDING',   desc: 'Yaz tatili izni' },
    { emp: 'EMP003', lt: 'personal', sD: dAgo(30),    eD: dAgo(29),    status: 'APPROVED',  desc: 'Resmi tapu işlemleri' },
    { emp: 'EMP006', lt: 'annual',   sD: dAgo(60),    eD: dAgo(52),    status: 'APPROVED',  desc: 'Güz dönemi yıllık izin' },
    { emp: 'EMP011', lt: 'unpaid',   sD: dAgo(40),    eD: dAgo(35),    status: 'REJECTED',  desc: 'Ücretsiz izin talebi (kadro yetersizliği)' },
  ];

  for (const r of leaveRows) {
    const emp = userMap[r.emp]?.emp;
    const lt  = ltMap[r.lt] || Object.values(ltMap)[0];
    if (!emp || !lt) continue;
    const start = new Date(r.sD); start.setHours(0, 0, 0, 0);
    const end   = new Date(r.eD); end.setHours(0, 0, 0, 0);
    const days  = Math.max(1, Math.round((end - start) / 86400000) + 1);
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: lt.id,
        startDate: start,
        endDate: end,
        days,
        status: r.status,
        description: r.desc,
        approvedById: r.status === 'APPROVED' && adminUser ? adminUser.id : null,
        approvedAt:   r.status === 'APPROVED' ? dAgo(1) : null,
      }
    });
  }
  console.log(`  ✅ İzin talepleri: ${leaveRows.length} kayıt`);

  // 2. BORDRO
  console.log('💰 Bordro verileri yükleniyor...');
  await prisma.payrollItem.deleteMany({});
  const periods = [
    { year: 2026, month: 7,  status: 'PAID'     },
    { year: 2026, month: 8,  status: 'PAID'     },
    { year: 2026, month: 9,  status: 'APPROVED' },
    { year: 2026, month: 10, status: 'DRAFT'    },
  ];

  let pCount = 0;
  for (const { emp, salary } of Object.values(userMap)) {
    for (const per of periods) {
      const otAmt    = rand(0, 4) * (salary / 30 / 8);
      const leaveDed = rand(0, 2) * (salary / 30);
      const gross    = salary + otAmt - leaveDed;
      await prisma.payrollItem.create({
        data: {
          employeeId: emp.id,
          periodYear: per.year,
          periodMonth: per.month,
          baseSalary: salary,
          overtimeAmount: Math.round(otAmt),
          leaveDeduction: Math.round(leaveDed),
          grossAmount: Math.round(gross),
          netAmount: Math.round(gross * 0.85),
          status: per.status,
          note: `${per.year}/${per.month.toString().padStart(2, '0')} dönemi maaş tahakkuku`,
          approvedAt: per.status !== 'DRAFT' ? dAgo(rand(5, 15)) : null,
        }
      });
      pCount++;
    }
  }
  console.log(`  ✅ Bordro: ${pCount} kayıt`);

  // 3. MESAİ
  console.log('⏱️  Mesai verileri yükleniyor...');
  await prisma.overtime.deleteMany({});
  const otRows = [
    { emp: 'EMP005', hours: 3, rate: 1.5, status: 'APPROVED', dA: 5,  note: 'Saha altyapı çalışması uzatması' },
    { emp: 'EMP006', hours: 2, rate: 1.5, status: 'APPROVED', dA: 8,  note: 'Yıllık rapor hazırlama mesaisi' },
    { emp: 'EMP007', hours: 4, rate: 2.0, status: 'PENDING',  dA: 2,  note: 'Acil kent parkı su patlağı onarımı' },
    { emp: 'EMP003', hours: 5, rate: 1.5, status: 'APPROVED', dA: 12, note: 'Fen İşleri şantiye denetimi' },
    { emp: 'EMP011', hours: 3, rate: 1.5, status: 'REJECTED', dA: 15, note: 'Yol onarımı ek mesai (onaysız)' },
    { emp: 'EMP008', hours: 2, rate: 1.5, status: 'APPROVED', dA: 20, note: 'Hafta sonu nikah merasimi mesaisi' },
    { emp: 'EMP009', hours: 6, rate: 2.0, status: 'PENDING',  dA: 1,  note: 'Pazar günü cadde ağaç budama çalışması' },
    { emp: 'EMP010', hours: 2, rate: 1.5, status: 'APPROVED', dA: 25, note: 'Mezarlık bilgi sistemi ay sonu kapanışı' },
    { emp: 'EMP005', hours: 4, rate: 1.5, status: 'APPROVED', dA: 35, note: 'Köprü asfalt döküm gece vardiyası' },
    { emp: 'EMP012', hours: 3, rate: 1.5, status: 'APPROVED', dA: 10, note: 'Resmi nikah evrak teslim süreci' },
  ];

  for (const ot of otRows) {
    const emp = userMap[ot.emp]?.emp;
    if (!emp) continue;
    await prisma.overtime.create({
      data: {
        employeeId: emp.id,
        date: dAgo(ot.dA),
        hours: ot.hours,
        rate: ot.rate,
        status: ot.status,
        description: ot.note,
        approvedById: ot.status === 'APPROVED' && adminUser ? adminUser.id : null,
        approvedAt:   ot.status === 'APPROVED' ? dAgo(ot.dA - 1) : null,
      }
    });
  }
  console.log(`  ✅ Mesai: ${otRows.length} kayıt`);

  // 4. AVANS
  console.log('💳 Avans talepleri yükleniyor...');
  await prisma.advance.deleteMany({});
  const advRows = [
    { emp: 'EMP005', amount: 5000, status: 'APPROVED', dA: 10, desc: 'Araç motor bakım ve tamir masrafı' },
    { emp: 'EMP007', amount: 4000, status: 'APPROVED', dA: 20, desc: 'Çocuk okul eğitim masrafları' },
    { emp: 'EMP009', amount: 2500, status: 'PENDING',  dA: 1,  desc: 'Beklenmedik sağlık gideri' },
    { emp: 'EMP011', amount: 4500, status: 'REJECTED', dA: 30, desc: 'Ev tadilat ve boya masrafı' },
    { emp: 'EMP012', amount: 3000, status: 'APPROVED', dA: 45, desc: 'Evlilik hazırlıkları kırtasiye/masraf' },
    { emp: 'EMP008', amount: 6000, status: 'APPROVED', dA: 15, desc: 'Ev taşınma ve nakliye masrafı' },
    { emp: 'EMP006', amount: 3500, status: 'PENDING',  dA: 3,  desc: 'Mesleki sertifikasyon sınav ücreti' },
  ];

  for (const adv of advRows) {
    const emp = userMap[adv.emp]?.emp;
    if (!emp) continue;
    await prisma.advance.create({
      data: {
        employeeId: emp.id,
        amount: adv.amount,
        description: adv.desc,
        status: adv.status,
        periodYear: 2026,
        periodMonth: 10,
        createdAt: dAgo(adv.dA),
        approvedById: adv.status === 'APPROVED' && adminUser ? adminUser.id : null,
        approvedAt:   adv.status === 'APPROVED' ? dAgo(adv.dA - 1) : null,
      }
    });
  }
  console.log(`  ✅ Avans: ${advRows.length} kayıt`);

  // 5. PRİM
  console.log('🎁 Prim verileri yükleniyor...');
  await prisma.bonus.deleteMany({});
  const bonusRows = [
    { emp: 'EMP003', amount: 8000,  desc: 'Köprü Kavşak Projesi Başarı Primi', status: 'APPROVED', dA: 30 },
    { emp: 'EMP004', amount: 6000,  desc: 'Kent Parkı Revizyon Başarı Primi',  status: 'APPROVED', dA: 60 },
    { emp: 'EMP005', amount: 3500,  desc: 'Zorlu Kış Saha Çalışma Primi',      status: 'APPROVED', dA: 20 },
    { emp: 'EMP007', amount: 2500,  desc: 'Geri Dönüşüm Sistemi Katkı Primi',  status: 'PENDING',  dA: 5  },
    { emp: 'EMP008', amount: 3000,  desc: 'Örnek Hizmet Yılbaşı İkramiyesi',    status: 'APPROVED', dA: 90 },
    { emp: 'EMP010', amount: 3000,  desc: 'Örnek Hizmet Yılbaşı İkramiyesi',    status: 'APPROVED', dA: 90 },
    { emp: 'EMP001', amount: 15000, desc: 'Yönetim ve Dijital Dönüşüm Primi',   status: 'APPROVED', dA: 45 },
    { emp: 'EMP002', amount: 5000,  desc: 'İK İşe Alım & Uyum Süreci Primi',    status: 'PENDING',  dA: 2  },
  ];

  for (const bn of bonusRows) {
    const emp = userMap[bn.emp]?.emp;
    if (!emp) continue;
    await prisma.bonus.create({
      data: {
        employeeId: emp.id,
        amount: bn.amount,
        description: bn.desc,
        date: dAgo(bn.dA),
        status: bn.status,
        approvedById: bn.status === 'APPROVED' && adminUser ? adminUser.id : null,
        approvedAt:   bn.status === 'APPROVED' ? dAgo(bn.dA - 1) : null,
        paymentDate:  bn.status === 'APPROVED' ? dAgo(bn.dA - 2) : null,
      }
    });
  }
  console.log(`  ✅ Prim: ${bonusRows.length} kayıt`);

  // 6. CEZA VE ÖDÜL KAYITLARI
  console.log('📋 Ceza / Ödül kayıtları yükleniyor...');
  await prisma.employeeRecord.deleteMany({});
  const recRows = [
    { emp: 'EMP009', cat: 'DISCIPLINARY', type: 'WARNING',   title: 'Mesaiye Geç Kalma İhtarı',    desc: 'Son 1 ayda geçerli mazeretsiz 4 defa mesaiye geç kalındığı tespit edilmiştir.',          dA: 15 },
    { emp: 'EMP011', cat: 'DISCIPLINARY', type: 'WARNING',   title: 'İzinsiz Görev Yeri Terki',    desc: 'Şantiye saatleri içerisinde izin alınmaksızın görev yerinden ayrılma.',                     dA: 25 },
    { emp: 'EMP006', cat: 'DISCIPLINARY', type: 'REPRIMAND', title: 'İSG Kurallarına Uymama',      desc: 'Baret ve iş güvenliği yeleği kullanım talimatlarına uyulmadığı tutanakla saptanmıştır.',  dA: 40 },
    { emp: 'EMP005', cat: 'REWARD',       type: 'PRAISE',    title: 'Üstün Görev Başarısı Teşekkürü', desc: 'Cumhuriyet Caddesi yol çöküntüsü acil müdahalesinde gece boyu gösterilen gayret.', dA: 10 },
    { emp: 'EMP003', cat: 'REWARD',       type: 'AWARD',     title: 'Yılın Başarılı Birim Yöneticisi', desc: '2026 yılı Fen İşleri projelerini bütçe dahilinde zamanında tamamlama başarısı.',  dA: 30 },
    { emp: 'EMP007', cat: 'REWARD',       type: 'CERTIFICATE', title: 'Çevre Duyarlılığı Sertifikası', desc: 'Park ve yeşil alanlarda akıllı damlama sulama sistemi projelendirme katkısı.',  dA: 20 },
  ];

  for (const rec of recRows) {
    const emp = userMap[rec.emp]?.emp;
    if (!emp || !adminUser) continue;
    await prisma.employeeRecord.create({
      data: {
        employeeId: emp.id,
        issuedById: adminUser.id,
        category: rec.cat,
        type: rec.type,
        title: rec.title,
        description: rec.desc,
        date: dAgo(rec.dA),
      }
    });
  }
  console.log(`  ✅ Ceza/Ödül: ${recRows.length} kayıt`);

  // 7. ZİMMET
  console.log('📦 Zimmet kayıtları yükleniyor...');
  await prisma.asset.deleteMany({});
  const assetRows = [
    { emp: 'EMP001', name: 'MacBook Pro 16" M3 Max',          serialNo: 'MBP2026001', cat: 'Laptop',   status: 'ASSIGNED' },
    { emp: 'EMP002', name: 'Dell Latitude 5540 i7',            serialNo: 'DL2026002',  cat: 'Laptop',   status: 'ASSIGNED' },
    { emp: 'EMP003', name: 'iPhone 15 Pro 256GB Kurumsal',      serialNo: 'IPH2026003', cat: 'Telefon',  status: 'ASSIGNED' },
    { emp: 'EMP004', name: 'Samsung Galaxy S24 Ultra',          serialNo: 'SGS2026004', cat: 'Telefon',  status: 'ASSIGNED' },
    { emp: 'EMP005', name: '3M Güvenlik Kaskı ve İSG Seti',    serialNo: 'CSK2026005', cat: 'Ekipman',  status: 'ASSIGNED' },
    { emp: 'EMP007', name: 'Stihl Profesyonel Budama Makası',  serialNo: 'BDM2026007', cat: 'El Aleti', status: 'ASSIGNED' },
    { emp: 'EMP003', name: 'Toyota Hilux 4x4 Saha Aracı (34 BLD 101)', serialNo: 'VHC2026008', cat: 'Araç', status: 'ASSIGNED' },
    { emp: 'EMP004', name: 'Renault Trafic Hizmet Aracı (34 BLD 102)',  serialNo: 'VHC2026009', cat: 'Araç', status: 'ASSIGNED' },
    { emp: 'EMP011', name: 'Bosch GBH Kırıcı-Delici Matkap',   serialNo: 'MTK2026010', cat: 'El Aleti', status: 'ASSIGNED' },
    { emp: 'EMP006', name: 'Samsung Galaxy Tab Active 4 Pro',  serialNo: 'TBL2026011', cat: 'Tablet',   status: 'RETURN_PENDING' },
    { emp: 'EMP008', name: 'HP LaserJet Enterprise Yazıcı',    serialNo: 'PRN2026012', cat: 'Donanım',  status: 'ASSIGNED' },
  ];

  for (const a of assetRows) {
    const emp = userMap[a.emp]?.emp;
    if (!emp) continue;
    await prisma.asset.create({
      data: {
        employeeId: emp.id,
        name: a.name,
        serialNo: a.serialNo,
        category: a.cat,
        status: a.status,
        assignedDate: dAgo(rand(30, 180)),
        note: `${a.emp} adına belediye envanterinden zimmetlenmiştir.`,
      }
    });
  }
  console.log(`  ✅ Zimmet: ${assetRows.length} kayıt`);

  // 8. GÖREVLER VE YORUMLAR
  console.log('✅ Görevler ve yorumlar yükleniyor...');
  await prisma.taskComment.deleteMany({});
  await prisma.task.deleteMany({});
  const taskDefs = [
    { emp: 'EMP005', title: 'Cumhuriyet Cd. Yol Çöküğü Acil Müdahale',  desc: 'Cumhuriyet Cd. 45. sokak kesişiminde su hattı patlaması sonrası oluşan çöküğün tamiri.', prio: 'HIGH',   status: 'IN_PROGRESS', due: 3   },
    { emp: 'EMP007', title: 'Kent Parkı Otomatik Sulama Bakımı',       desc: 'Tüm sulama vanalarının sızdırmazlık kontrolü ve filtre temizliği.',                       prio: 'MEDIUM', status: 'TODO',        due: 10  },
    { emp: 'EMP006', title: 'İlçe Geneli Köprü Korkuluk Denetimi',      desc: 'Bariyer ve korkulukların paslanma ve dayanıklılık muayenesi.',                           prio: 'HIGH',   status: 'DONE',        due: -5  },
    { emp: 'EMP008', title: '2026 Nikah Arşivlerinin Dijitalleştirilmesi', desc: 'Ocak-Ekim dönemi nikah akitlerinin EBYS sistemine taranarak yüklenmesi.',            prio: 'LOW',    status: 'IN_PROGRESS', due: 15  },
    { emp: 'EMP003', title: '2027 Fen İşleri Yatırım Bütçe Taslağı',   desc: 'Fen İşleri Müdürlüğü yeni dönem asfalt ve kaldırım yenileme bütçesi.',                   prio: 'HIGH',   status: 'TODO',        due: 20  },
    { emp: 'EMP009', title: 'Kış Öncesi Cadde Ağaç Budama Operasyonu', desc: 'Fırtına riski taşıyan ana arter kavak ve çınar ağaçlarının budanması.',                 prio: 'MEDIUM', status: 'IN_PROGRESS', due: 25  },
    { emp: 'EMP011', title: 'Yol Çukurları Asfalt Yama Programı',       desc: 'Gelen çağrı merkezi talepleri doğrultusunda 12 sokakta asfalt yama yapılması.',           prio: 'MEDIUM', status: 'DONE',        due: -8  },
    { emp: 'EMP010', title: 'Mezarlık Bilgi Sistemi Parsel Güncellemesi', desc: 'Merkez mezarlığı 3. ada parsel numaralandırma güncellemesi.',                         prio: 'LOW',    status: 'TODO',        due: 18  },
    { emp: 'EMP012', title: 'Q3 Nikah ve Evlendirme İstatistik Raporu', desc: 'Başkanlık brifingi için 3. çeyrek evlilik istatistiklerinin grafiklerle sunumu.',       prio: 'MEDIUM', status: 'DONE',        due: -2  },
    { emp: 'EMP004', title: 'Millet Bahçesi 2. Etap Peyzaj Projesi',   desc: 'Yürüyüş yolları, çocuk oyun alanları ve aydınlatma yerleşim planı.',                      prio: 'HIGH',   status: 'IN_PROGRESS', due: 40  },
    { emp: 'EMP002', title: '2027 Personel İSG ve Yangın Eğitimi Planı', desc: 'Yıllık zorunlu iş sağlığı ve acil tahliye tatbikat takviminin hazırlanması.',         prio: 'MEDIUM', status: 'TODO',        due: 50  },
    { emp: 'EMP005', title: 'Hizmet Binası Elektrik Panosu Yıllık Bakımı', desc: 'Ana trafo ve dağıtım panolarının termal kamera ile kontrolü.',                       prio: 'HIGH',   status: 'DONE',        due: -1  },
  ];

  const taskRecs = [];
  for (const t of taskDefs) {
    const emp = userMap[t.emp]?.emp;
    if (!emp || !adminUser) continue;
    const tr = await prisma.task.create({
      data: {
        employeeId: emp.id,
        createdById: adminUser.id,
        title: t.title,
        description: t.desc,
        priority: t.prio,
        status: t.status,
        dueDate: dFuture(t.due),
        assignedAt: dAgo(rand(3, 12)),
        completedAt: t.status === 'DONE' ? dAgo(Math.abs(t.due)) : null,
      }
    });
    taskRecs.push({ id: tr.id, empNo: t.emp });
  }

  const commentDefs = [
    { idx: 0, empNo: 'EMP001', text: 'Eren KIRMIZI: Acil müdahale ekibi yönlendirildi, trafik ekipleri bilgilendirildi.' },
    { idx: 0, empNo: 'EMP005', text: 'Ali Çelik: Olay yerine ulaştık, malzeme tedariği yapılıyor. 4 saat içinde tamamlanacak.' },
    { idx: 0, empNo: 'EMP003', text: 'Mehmet Kaya: Asfalt yama ekibi hazır bekliyor, kazı biter bitmez dökülecek.' },
    { idx: 2, empNo: 'EMP006', text: 'Zeynep Arslan: 8 köprünün tamamı incelendi, 2 noktadaki paslı bağlantılar yenilendi.' },
    { idx: 2, empNo: 'EMP001', text: 'Eren KIRMIZI: Rapor teslim alındı, emeğinize sağlık.' },
    { idx: 4, empNo: 'EMP003', text: 'Mehmet Kaya: Mali Hizmetler Müdürlüğü birim fiyat listeleri bekleniyor.' },
    { idx: 6, empNo: 'EMP011', text: 'Kadir Aydın: Belirtilen 12 sokakta 42 adet yama tamamlandı, fotoğraflar eklendi.' },
    { idx: 9, empNo: 'EMP004', text: 'Ayşe Şahin: Peyzaj mimarı ile ilk taslak üzerinde mutabık kalındı.' },
    { idx: 11, empNo: 'EMP005', text: 'Ali Çelik: Termal taramada aşırı ısınan klemens yenisiyle değiştirildi.' },
  ];

  for (const c of commentDefs) {
    if (c.idx >= taskRecs.length) continue;
    const user = userMap[c.empNo]?.user;
    if (!user) continue;
    await prisma.taskComment.create({
      data: {
        taskId: taskRecs[c.idx].id,
        createdById: user.id,
        content: c.text,
      }
    });
  }
  console.log(`  ✅ Görev: ${taskDefs.length} görev, ${commentDefs.length} yorum`);

  // 9. RESMİ EVRAK YÖNETİMİ
  console.log('📄 Evrak yönetimi verileri yükleniyor...');
  await prisma.document.deleteMany({});
  const docRows = [
    { emp: 'EMP005', subject: 'İnşaat İskele Güvenlik Belgesi',      num: 'EVR-2026-00142', prio: 'HIGH',   status: 'IN_PROGRESS', note: 'İlçe Yapı Denetim onayı bekleniyor.' },
    { emp: 'EMP003', subject: '2026 Kar Küreme Hazırlık Raporu',     num: 'EVR-2026-00188', prio: 'NORMAL', status: 'DONE',        note: 'Başkanlık Makamına sunuldu, onaylandı.' },
    { emp: 'EMP007', subject: 'Zirai Mücadele ve İlaçlama İzin Yazısı', num: 'EVR-2026-00215', prio: 'HIGH',   status: 'IN_PROGRESS', note: 'İl Tarım ve Orman Müdürlüğü yazışması sürüyor.' },
    { emp: 'EMP008', subject: 'Aylık Evlendirme İcmal Listesi',       num: 'EVR-2026-00244', prio: 'NORMAL', status: 'DONE',        note: 'İl Nüfus Müdürlüğüne teslim edildi.' },
    { emp: 'EMP011', subject: 'Ağır Vasıta Operatörlük Belgesi',     num: 'EVR-2026-00279', prio: 'LOW',    status: 'DONE',        note: 'Personel özlük dosyasına işlendi.' },
    { emp: 'EMP006', subject: 'İSG Kurul Toplantı Tutanağı (Ekim)',  num: 'EVR-2026-00305', prio: 'NORMAL', status: 'PENDING',     note: 'Kurul üyelerinin imzaları toplanıyor.' },
    { emp: 'EMP002', subject: 'Hizmet İçi Eğitim Sertifikaları',     num: 'EVR-2026-00318', prio: 'LOW',    status: 'DONE',        note: '45 personelin sertifikası sisteme işlendi.' },
    { emp: 'EMP010', subject: 'Mezarlık İmar Plan Değişikliği Talep', num: 'EVR-2026-00342', prio: 'HIGH',   status: 'PENDING',     note: 'Belediye Meclisi İmar Komisyonunda.' },
  ];

  for (const doc of docRows) {
    const emp = userMap[doc.emp]?.emp;
    if (!emp) continue;
    await prisma.document.create({
      data: {
        employeeId: emp.id,
        subject: doc.subject,
        documentNo: doc.num,
        priority: doc.prio,
        status: doc.status,
        note: doc.note,
        receivedAt: dAgo(rand(3, 45)),
      }
    });
  }
  console.log(`  ✅ Evrak: ${docRows.length} kayıt`);

  // 10. DUYURULAR
  console.log('📢 Duyurular yükleniyor...');
  await prisma.announcementRead.deleteMany({});
  await prisma.announcementEmployee.deleteMany({});
  await prisma.announcement.deleteMany({});
  const annDefs = [
    { title: '2026 Yılsonu İzin ve Nöbet Programı',        content: 'Sayın Personelimiz, 2026 yılı Kasım ve Aralık dönemi yıllık izin planlamalarınızı en geç 5 Kasım tarihine kadar birim amirlerinize bildirmeniz rica olunur. Nöbetçi personel listesi ayrıca ilan edilecektir.', status: 'PUBLISHED', dA: 4  },
    { title: 'İş Sağlığı ve Güvenliği Kışlık Kıyafet Dağıtımı', content: 'Saha personelimizin zorlu kış şartlarında giyeceği su geçirmez mont, termal tulum ve çelik burunlu kışlık botlar Destek Hizmetleri deposundan dağıtılmaya başlanmıştır.', status: 'PUBLISHED', dA: 10 },
    { title: '2027 Mali Yılı Bütçe Planlama Toplantısı',      content: 'Tüm birim amirleri ve müdürlerimizin katılımıyla 2027 yılı tahmini bütçe ve yatırım planlama toplantısı 28 Ekim Salı günü saat 14:00\'te Meclis Salonunda gerçekleştirilecektir.', status: 'PUBLISHED', dA: 2  },
    { title: 'Cumhuriyet Bayramı Kutlama Programı ve Tören',   content: '29 Ekim Cumhuriyet Bayramımızın 103. yılı kutlamaları kapsamında düzenlenecek resmi törene ve fener alayına tüm belediye personelimiz ve aileleri davetlidir.', status: 'PUBLISHED', dA: 6  },
    { title: 'Personel Memnuniyet ve Geri Bildirim Anketi',    content: 'Çalışma koşullarını ve kurum içi iletişimi geliştirmek amacıyla hazırlanan yıllık personel anketi önümüzdeki hafta dijital ortamda erişime açılacaktır.', status: 'DRAFT',     dA: 1  },
  ];

  const empList = Object.values(userMap);
  for (const ann of annDefs) {
    if (!adminUser) continue;
    const rec = await prisma.announcement.create({
      data: {
        createdById: adminUser.id,
        title: ann.title,
        content: ann.content,
        targetType: 'ALL',
        status: ann.status,
        publishAt: ann.status === 'PUBLISHED' ? dAgo(ann.dA) : null,
      }
    });

    if (ann.status === 'PUBLISHED') {
      for (const { emp } of empList) {
        await prisma.announcementEmployee.create({
          data: { announcementId: rec.id, employeeId: emp.id }
        }).catch(() => {});
      }
      // %75'i okumuş olsun
      const readers = empList.slice(0, Math.floor(empList.length * 0.75));
      for (const { emp } of readers) {
        await prisma.announcementRead.create({
          data: {
            announcementId: rec.id,
            employeeId: emp.id,
            readAt: dAgo(rand(0, ann.dA))
          }
        }).catch(() => {});
      }
    }
  }
  console.log(`  ✅ Duyuru: ${annDefs.length} kayıt`);

  // 11. BİLDİRİMLER
  console.log('🔔 Bildirimler yükleniyor...');
  await prisma.notification.deleteMany({});
  const notifRows = [
    { empNo: 'EMP001', type: 'LEAVE_REQUEST',     title: 'Yeni İzin Onay Talebi',    body: 'Elif Çetin 8 günlük yıllık izin talebinde bulundu.',             read: false, dA: 1 },
    { empNo: 'EMP001', type: 'OVERTIME_REQUEST',  title: 'Mesai Onayı Bekleniyor',    body: 'Emre Yıldız 6 saatlik pazar mesaisi onayınızı bekliyor.',        read: false, dA: 1 },
    { empNo: 'EMP001', type: 'GENERAL',           title: 'Avans Talebi',              body: 'Merve Kılıç 6.000 TL taşınma avansı onayınıza sunuldu.',         read: true,  dA: 15 },
    { empNo: 'EMP003', type: 'TASK_ASSIGNED',     title: 'Görev Ataması',             body: '"2027 Fen İşleri Yatırım Bütçesi" görevi size atandı.',          read: true,  dA: 5 },
    { empNo: 'EMP005', type: 'LEAVE_APPROVED',    title: 'İzniniz Onaylandı',         body: '5 günlük yıllık tatil izni talebiniz onaylandı.',                 read: true,  dA: 19 },
    { empNo: 'EMP005', type: 'TASK_ASSIGNED',     title: 'Acil Görev',                body: '"Cumhuriyet Cd. Yol Çöküğü" görevi acil olarak atandı.',         read: true,  dA: 2 },
    { empNo: 'EMP006', type: 'OVERTIME_APPROVED', title: 'Mesai Onaylandı',           body: '2 saatlik ek mesai talebiniz sistemde onaylandı.',               read: true,  dA: 7 },
    { empNo: 'EMP007', type: 'GENERAL',           title: 'Prim Talebi Süreçte',       body: 'Geri Dönüşüm Sistemi Katkı Priminiz değerlendirme aşamasında.',  read: false, dA: 4 },
    { empNo: 'EMP008', type: 'LEAVE_APPROVED',    title: 'İzniniz Onaylandı',         body: '3 günlük yıllık izin başvurunuz onaylanmıştır.',                  read: true,  dA: 4 },
    { empNo: 'EMP009', type: 'OVERTIME_REQUEST',  title: 'Mesai Talebi Alındı',       body: 'Pazar günü 6 saatlik mesai başvurunuz amirinize iletildi.',      read: true,  dA: 1 },
    { empNo: 'EMP010', type: 'GENERAL',           title: 'Avans Ödemesi Yapıldı',     body: 'Talep ettiğiniz avans tutarı hesabınıza aktarıldı.',             read: false, dA: 14 },
    { empNo: 'EMP011', type: 'LEAVE_REJECTED',    title: 'İzin Talebi Reddi',         body: 'Ücretsiz izin talebiniz birim iş yoğunluğu nedeniyle ertelendi.', read: true,  dA: 29 },
    { empNo: 'EMP012', type: 'ANNOUNCEMENT',      title: 'Yeni Genel Duyuru',         body: '"2026 Yılsonu İzin ve Nöbet Programı" duyurusu yayınlandı.',      read: false, dA: 4 },
    { empNo: 'EMP002', type: 'GENERAL',           title: 'Özlük Dosyası Güncellendi', body: 'Kadir Aydın için yeni sürücü belgesi sisteme yüklendi.',         read: true,  dA: 2 },
    { empNo: 'EMP004', type: 'TASK_ASSIGNED',     title: 'Proje Güncellemesi',        body: '"Millet Bahçesi 2. Etap" projesine yeni notlar eklendi.',        read: false, dA: 3 },
  ];

  for (const n of notifRows) {
    const user = userMap[n.empNo]?.user;
    if (!user) continue;
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.read,
        readAt: n.read ? dAgo(n.dA - 1) : null,
        createdAt: dAgo(n.dA),
      }
    });
  }
  console.log(`  ✅ Bildirim: ${notifRows.length} kayıt`);

  // 12. QR KODLAR
  console.log('📱 QR Kod PDKS noktaları yükleniyor...');
  await prisma.qrCode.deleteMany({});
  for (const [locCode, point] of [['MERKEZ', 'Ana Hizmet Binası Protokol Girişi'], ['FEN', 'Fen İşleri Şantiye & Atölye Girişi'], ['PARK', 'Park Bahçeler Fidanlık Depo Girişi']]) {
    const loc = locMap[locCode];
    if (!loc || !adminUser) continue;
    await prisma.qrCode.create({
      data: {
        locationId: loc.id,
        createdById: adminUser.id,
        token: 'qr_' + Math.random().toString(36).slice(2, 12),
        isActive: true,
        entryPointName: point,
        expiresAt: dFuture(365),
      }
    });
  }
  console.log('  ✅ QR Kod: 3 giriş noktası oluşturuldu');

  // 13. KART SİSTEMİ (PDKS KARTLARI VE OKUYUCULAR)
  console.log('💳 PDKS Kart Sistemi yükleniyor...');
  await prisma.cardCredentialLocation.deleteMany({});
  await prisma.cardCredential.deleteMany({});
  await prisma.cardReader.deleteMany({});

  const readers = [
    { name: 'Ana Bina Turnike A1',  locCode: 'MERKEZ', serial: 'RDR-MERKEZ-01' },
    { name: 'Şantiye Giriş Turnike', locCode: 'FEN',    serial: 'RDR-SANTIYE-01' },
    { name: 'Park Bahçeler Turnike', locCode: 'PARK',   serial: 'RDR-PARK-01' },
  ];

  for (const r of readers) {
    const loc = locMap[r.locCode];
    if (!loc) continue;
    await prisma.cardReader.create({
      data: {
        name: r.name,
        serialNo: r.serial,
        locationId: loc.id,
        isActive: true,
      }
    });
  }

  const merkez = locMap['MERKEZ'];
  for (const no of ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006', 'EMP007', 'EMP008']) {
    const emp = userMap[no]?.emp;
    if (!emp || !merkez) continue;
    const cred = await prisma.cardCredential.create({
      data: {
        employeeId: emp.id,
        cardUid: 'CRD' + no.replace('EMP', '').padStart(7, '0'),
        isActive: true,
        note: `${emp.firstName} ${emp.lastName} RFID Personel Kimlik Kartı`,
      }
    });
    await prisma.cardCredentialLocation.create({
      data: {
        credentialId: cred.id,
        locationId: merkez.id,
      }
    }).catch(() => {});
  }
  console.log('  ✅ Kart Sistemi: 3 okuyucu cihaz, 8 RFID kartı tanımlandı');

  // 14. DENETİM LOGLARI (AUDIT LOGS)
  console.log('📝 Denetim logları yükleniyor...');
  await prisma.auditLog.deleteMany({});
  const ikUser = userMap['EMP002']?.user;
  const logRows = [
    { actor: adminUser, action: 'employee.create',  entityType: 'Employee',      after: { detail: 'Elif Çetin personel kaydı oluşturuldu' },          dA: 60 },
    { actor: adminUser, action: 'leave.approve',    entityType: 'LeaveRequest',  after: { detail: 'Ali Çelik yıllık izin talebi onaylandı' },          dA: 19 },
    { actor: adminUser, action: 'overtime.approve', entityType: 'Overtime',      after: { detail: 'Zeynep Arslan mesai onaylandı' },                  dA: 7  },
    { actor: adminUser, action: 'bonus.create',     entityType: 'Bonus',         after: { detail: 'Mehmet Kaya için proje başarı primi tanımlandı' },   dA: 44 },
    { actor: ikUser || adminUser, action: 'employee.update', entityType: 'Employee', after: { detail: 'Hasan Öztürk iletişim bilgileri güncellendi' }, dA: 30 },
    { actor: adminUser, action: 'payroll.approve',  entityType: 'PayrollItem',   after: { detail: 'Eylül 2026 bordro icmali onaylandı' },             dA: 15 },
    { actor: ikUser || adminUser, action: 'record.create', entityType: 'EmployeeRecord', after: { detail: 'Emre Yıldız için ihtiyarname kaydı açıldı' }, dA: 25 },
    { actor: adminUser, action: 'asset.assign',     entityType: 'Asset',         after: { detail: 'Kadir Aydın adına matkap zimmetlendi' },           dA: 45 },
    { actor: adminUser, action: 'announcement.create', entityType: 'Announcement', after: { detail: '2026 Yılsonu İzin Programı duyurusu yayınlandı' }, dA: 4 },
  ];

  for (const l of logRows) {
    if (!l.actor) continue;
    await prisma.auditLog.create({
      data: {
        actorUserId: l.actor.id,
        action: l.action,
        entityType: l.entityType,
        result: 'SUCCESS',
        ip: '192.168.1.' + rand(10, 80),
        after: l.after,
        createdAt: dAgo(l.dA),
      }
    }).catch(() => {});
  }
  console.log(`  ✅ Denetim Logu: ${logRows.length} log kaydedildi`);

  console.log('\n======================================================');
  console.log('🎉 TÜM VERİ TABANI EKSİKSİZ DOLDURULDU!');
  console.log('======================================================\n');
}

main()
  .catch((err) => {
    console.error('💥 HATA:', err.message, '\n', err.stack);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
