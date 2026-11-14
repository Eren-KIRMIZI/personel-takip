# Personel ve İnsan Kaynakları Yönetim Sistemi

Kurumsal personel ve İK yönetim sistemi. Personel özlük bilgileri, izin, puantaj (PDKS), giriş-çıkış (QR / kart / manuel), vardiya ve çalışma planları, mesai, maaş ve bordro, avans, prim, ceza/ödül, görev, zimmet, evrak, duyuru, bildirim ve kapsamlı raporlama süreçlerini tek platformda yönetir.

Video:
https://www.youtube.com/watch?v=6KKrMayb8JU

Proje `npm workspaces` tabanlı bir monorepo'dur:

* `apps/frontend` — React kullanıcı arayüzü
* `apps/backend` — NestJS REST API
* `packages/shared` — Ortak TypeScript tipleri
* `prisma` — Veritabanı şeması ve migration'lar
* `docs` — Mimari ve RBAC dokümanları

Uygulama Vercel üzerinde yayındadır; kimlik doğrulama, veritabanı, dosya depolama altyapısı Supabase (Frankfurt / eu-central-1), önbellek altyapısı Upstash Redis tarafından sağlanır.

**Canlı URL:** https://personel-takip-sigma.vercel.app

## İçindekiler

1. [Özellikler ve Modüller](#özellikler-ve-modüller)
2. [Teknoloji Yığını](#teknoloji-yığını)
3. [Mimari](#mimari)
4. [Proje Yapısı](#proje-yapısı)
5. [Ön Yüz: Rotalar ve Ekranlar](#ön-yüz-rotalar-ve-ekranlar)
6. [Backend: API Modülleri](#backend-api-modülleri)
7. [Raporlar Kataloğu](#raporlar-kataloğu)
8. [Kimlik Doğrulama ve Oturum Yönetimi](#kimlik-doğrulama-ve-oturum-yönetimi)
9. [Yetkilendirme (RBAC)](#yetkilendirme-rbac)
10. [Veritabanı (Prisma)](#veritabanı-prisma)
11. [Performans](#performans)
12. [Ortam Değişkenleri](#ortam-değişkenleri)
13. [Local Geliştirme](#local-geliştirme)
14. [Altyapı ve Deployment (Vercel)](#altyapı-ve-deployment-vercel)
15. [Güvenlik](#güvenlik)
16. [Gereksinim Dokümanı](#gereksinim-dokümanı)

---

## Özellikler ve Modüller

### Personel Yönetimi

Personel listesi (filtre + sayfalama), yeni personel ekleme (opsiyonel kullanıcı hesabı birlikte oluşturulur), sekmeli personel detay ekranı ve personel düzenleme. Detay ekranında sekmeler:

* Genel bilgiler
* Özlük bilgileri
* İzinler
* Mesai
* Giriş-çıkış hareketleri
* Çalışma planı / vardiya ataması
* Maaş ve bordro (cari maaş belirleme)
* Avanslar
* Ceza ve ödül kayıtları
* Zimmetler
* Görevler
* Evraklar
* PDKS kart bilgileri

Personel silme yerine durum değişimi (Aktif / Pasif / Askıda) desteklenir; her değişiklik görev geçmişine işlenir ve denetim kaydına yazılır.

### Organizasyon

Kurum (şirket), departman, birim, çalışma yeri (lokasyon), unvan ve pozisyon tanımları; fabrika tabanlı tek CRUD yapısıyla aynı davranışta 6 kaynak kümesi.

### İzin Yönetimi

İzin türleri (yıllık, mazeret, rapor, ücretsiz, süt izni vb.), izin talebi açma, onaylama/reddetme/iptal, tarih çakışma kontrolü ve yarım gün (sabah/öğleden sonra) desteği. Süt izni yalnızca tek gün ve yarım gün olarak verilebilir.

### Giriş-Çıkış ve PDKS

Dört farklı kaynak üzerinden giriş-çıkış (punch) kaydı:

* QR — kamerayla okutma; otomatik giriş/çıkış algılama
* Kart (PDKS) — kart kimlikleri, okuyucu cihazlar ve lokasyon kısıtlaması
* PDKS — cihaz akışı
* Manuel — yönetici müdahalesi

Test amaçlı bir PDKS simülatör ekranı da mevcuttur.

### Vardiya ve Çalışma Planları

Vardiya tanımları (başlangıç/bitiş, mola süresi, lokasyon), personel bazlı haftalık atamalar, toplu atama ve haftalık çalışma planı görünümü.

### Maaş, Avans, Prim

Aylık bordro üretimi ve hesaplama, bordro durum akışı (Taslak → Onaylandı → Ödendi), avans talebi ve onay akışı, prim kayıtları ve onay akışı.

### Mesai

Mesai kaydı açma, onaylama/reddetme/iptal, saat ve katsayı bilgisi.

### Görev, Zimmet, Evrak

Görev atama ve yorumlar, zimmet teslim/iade akışı (onay süreçli), evrak takibi (öncelik ve durum yönetimi).

### Ceza ve Ödül

Disiplin (uyarı, kınama, uzaklaştırma, kesinti, işten çıkarma) ve teşvik (takdir, ödül, başarı belgesi) kayıtları.

### Duyuru ve Bildirim

Duyuru oluşturma ve yayınlama (tümü / departman / birim / belirli personel), okundu takibi; sistem içi bildirimler ve okunmamış sayacı.

### Raporlar

Tek sayfalık katalog yapısı: Genel (19) ve Hesap (5) raporları, arama, tarih aralığı ve personel filtreleri, Excel/CSV dışa aktarım. Bkz. [Raporlar Kataloğu](#raporlar-kataloğu).

### Erişim Yönetimi

Rol ve yetki tanımları, kullanıcı yönetimi (durum, rol atama), denetim logları ekranı.

### Sistem Sağlığı ve Otomatik Olay İzleme

Sistem bileşenlerini ve modüllerini gerçek zamanlı takip eden gözlemleme mekanizması. Temel prensibi **"müdahalesiz izleme"**dir; sistem ve veri bütünlüğüne otomatik müdahale yapmaz, sorunları tespit edip sınıflandırarak yazılım ekibine yönlendirir.

* **Kritiklik Düzeyleri ve Renk Tasarımı:**
  * 🔴 **Kritik Hata (KIRMIZI)**: Sistem genelini veya ana modülleri engelleyen, acil müdahale gerektiren yüksek öncelikli olaylar (en üstte acil durum banner'ı ile gösterilir).
  * 🟣 **Hata (MOR)**: Belirli bir modülde işlem akışını kesintiye uğratan fonksiyonel hatalar.
  * 🟡 **Uyarı (SARI)**: Yüksek gecikme, bellek/kaynak kullanım eşiği veya yavaşlayan servis uyarıları.
  * 🟢 **Problem Yok / Sağlıklı (YEŞİL)**: Sağlıklı çalışan bileşenler ve servisler.
* **Sağlık Kontrolleri:** PostgreSQL veritabanı yanıt süresi, Upstash Redis önbellek bağlantısı, Node.js heap belleği, event loop gecikmesi.
* **İstemci Hata Raporlama:** Frontend'de yakalanan beklenmedik hatalar anında `/api/monitoring/client-error` uç noktasıyla merkezi havuza aktarılır.
* **Admin Dashboard Kartı:** Yönetici ana panelinde kompakt durum göstergesi ve kritik olay sayısı rozeti.
* **Aksiyonlar:** Olayları incelemeye alma (`acknowledge`), çözüldü olarak işaretleme (`resolve`), hata sıklığı/sayacı (`occurrenceCount`) ve yığın izi (`stack trace`) analizi.

---

## Teknoloji Yığını

### Frontend

| Katman | Teknoloji |
|---|---|
| Framework | React 19 |
| Build aracı | Vite 8 (Tailwind CSS 4 entegrasyonlu) |
| Dil | TypeScript |
| CSS | Tailwind CSS 4 (oklch renk uzayı, @theme inline) |
| UI Bileşenleri | Proje içi bileşenler (shadcn/ui deseni, CVA + tailwind-merge) |
| Routing | React Router 7 (createBrowserRouter) |
| Global State | Zustand 5 |
| Server State | TanStack Query 5 |
| Form Yönetimi | React Hook Form + Zod 4 |
| QR Okutma | @zxing/browser + @zxing/library (kamera ile) |
| İkonlar | lucide-react |
| Grafik | Yok (gerek duyulmadı; tablo/istatistik kartları kullanılır) |

### Backend

| Katman | Teknoloji |
|---|---|
| Framework | NestJS 10 (global prefix: /api, Swagger: /api/docs) |
| Dil | TypeScript |
| ORM | Prisma 6 |
| Veritabanı | Supabase (PostgreSQL) |
| Kimlik Doğrulama | Supabase Auth + JWT doğrulama (jose) |
| Yetkilendirme | Array of Guards (JwtAuthGuard + PermissionsGuard) |
| Önbellek | Upstash Redis (token ve kullanıcı yetki kümesi) |
| Dosya Depolama | Supabase Storage (base64 yükleme) |
| QR Üretimi | qrcode (PNG data URL) |
| Excel | ExcelJS (rapor dışa aktarımı) |
| API Dokümantasyonu | Swagger / OpenAPI |

Not: PDF üretimi bu sürümde yoktur. Maaş pusulası ve raporlar ekran üzerinden görüntülenir, gerekli durumlarda Excel/CSV olarak dışa aktarılır.

---

## Mimari

```
Kullanıcı (Tarayıcı / Mobil)
            |
            v
     +-------------------+
     |      Vercel       |
     |                   |
     | React + Vite      |
     | NestJS API        |
     | (standard Nest    |
     |  bootstrap +      |
     |  ince serverless  |
     |  adapter)         |
     +---------+---------+
               |
               v
     +-----------------------+
     |       Supabase        |
     |                       |
     | PostgreSQL            |
     | (Connection Pooler /  |
     |  PgBouncer, port 6543)|
     | Auth                  |
     | Storage               |
     +-----------------------+
               ^
               |
     +-----------------------+
     |     Upstash Redis     |
     | (JWT + yetki cache)   |
     +-----------------------+
```

Frontend, `@supabase/supabase-js` ile giriş yapar ve JWT'yi backend'e `Authorization: Bearer <token>` başlığıyla taşır. Backend token'ı doğrular, kullanıcıyı ve yetki kümesini yükler; her endpoint'te yetki kontrolü yineleme olarak uygulanır.

**Serverless adaptör:** Backend iş mantığından (modüller, servisler, DTO'lar) bağımsız standart `NestFactory.create()` bootstrap'u kullanır. Vercel'e bağlanmak için ayrı, ince bir adaptör dosyası vardır (`api/index.js`). Bu sayede istenirse backend ileride başka bir platforma (Railway, Render, VPS, Docker) taşınabilir.

Yetkilendirme kontrolü hem frontend'de (menü/buton gizleme) hem backend'de (guard zinciri) uygulanır. Kritik işlemler (personel değişikliği, maaş, izin/mesai onayı, rol/yetki değişikliği, QR tarama vb.) `AuditLog` tablosuna otomatik kaydedilir.

---

## Proje Yapısı

```
personel-takip/
|-- apps/
|   |-- frontend/                 # React + Vite uygulaması
|   |   |-- src/
|   |   |   |-- pages/            # Sayfa bileşenleri (route başına bir klasör)
|   |   |   |-- features/         # API istemcileri (modül başına)
|   |   |   |-- components/       # layout + ui bileşenleri
|   |   |   |-- stores/           # Zustand store'ları (auth)
|   |   |   |-- lib/              # api, supabase, prefetch, warm-up-engine, query-client, token
|   |-- backend/                  # NestJS API
|       |-- api/index.ts          # TypeScript serverless adaptör
|       |-- src/
|           |-- auth/             # JWT doğrulama, guard'lar, AuthenticatedUser
|           |-- common/           # Guard, decorator, scope helper'ları
|           |-- supabase/         # Service role admin istemcisi
|           |-- prisma/           # Prisma servisi
|           |-- modules/          # 21 iş modülü (employees, leave, ...)
|           |-- seed.ts           # Roller, yetkiler ve örnek veri
|-- api/index.js                  # Vercel serverless adapter (CommonJS)
|-- packages/shared/              # Ortak tip ve sabitler
|-- prisma/
|   |-- schema.prisma             # Veritabanı şeması
|   |-- migrations/               # Migration dosyaları
|-- docs/
|   |-- ARCHITECTURE.md           # Mimari dokümanı
|   |-- RBAC.md                   # Rol-yetki modeli
|-- vercel.json                   # Deployment yapılandırması
```

---

## Ön Yüz: Rotalar ve Ekranlar

Tüm rotalar `createBrowserRouter` ile tanımlanmış, sayfalar `React.lazy` ile code-split edilmiştir. Korumasız tek rota giriş ekranıdır; geri kalan tüm rotalar `ProtectedRoute` altındadır.

### Açılış Sekansı (Smart Warm-Up Engine v3 — 15 Saniye)

Uygulama ilk açıldığında Phoenix boot screen gösterilir ve Smart Warm-Up Engine dört aşamalı (15 saniye) tam donanımlı önbellekleme ve prefetch protokolü uygular:

| Faz | İçerik | Hedef İlerleme | Süre |
|---|---|---|---|
| Faz 1 | Kimlik doğrulama, oturum çözümlenmesi & DB bağlantı havuzu ısınması | %0 – %25 | 3.5s |
| Faz 2 | Kullanıcı yetkileri/roller taranması & tüm sayfa modül bundle'larının V8 motoruna alınması | %25 – %50 | 3.5s |
| Faz 3 | Sistem bileşenlerinin derlenmesi & çekirdek veri API prefetch motorunun tetiklenmesi | %50 – %75 | 3.5s |
| Faz 4 | Sayfa verilerinin React Query RAM önbelleğine basılması (Organizasyon, Personel, İzin, Vardiya vb.) | %75 – %100 | 3.5s |

*Tamamlanma:* %100'de 400ms son kontrol + 600ms pürüzsüz cross-fade çıkış geçişi (Toplam: 15.0 saniye).  
*Anlık Gezinme (Hover Prefetch):* Sol menüdeki herhangi bir linkin üzerine fare ile gelindiğinde (150-200ms insan reaksiyon süresinde) ilgili sayfanın React Query verisi ve chunk'ı anında önceden çekilerek 0ms geçiş hızı sağlanır.  
*Cold-Start Kalkanı & Vercel Cron:* 
- **Ön Cephe (Phoenix 0. Saniye):** Site açıldığı an paralel olarak `/api/auth/warmup` ve Supabase PostgREST tetiklenir; NestJS Vercel container'ı ve Prisma/PostgreSQL bağlantı havuzu ilk 3 saniyede uyanır.
- **Arka Plan Bekçisi (Vercel Cron):** `vercel.json` içindeki günlük cron (`0 6 * * *`) ile sistem 24 saatte bir otomatik dürtülür; Supabase'in uykuya geçmesi veya duraklaması engellenir.

**Performans takibi:** Her sayfa yüklenişinin süresi (`p95`) `localStorage`'da saklanır. `FAST < 500ms`, `SLOW 500–1800ms`, `CRITICAL > 1800ms`.

| Rota | Ekran |
|---|---|
| `/login` | Giriş (split korporatif tasarım, şifre göster/gizle, Beni hatırla, Şifremi unuttum) |
| `/` | Dashboard (istatistik kartları, günün özeti, hızlı işlemler) |
| `/personel` | Personel listesi |
| `/personel/yeni` | Yeni personel |
| `/personel/:id` | Personel detay (sekmeli) |
| `/personel/:id/duzenle` | Personel düzenleme |
| `/organizasyon` | Departman / birim / unvan / lokasyon yönetimi |
| `/izin` | İzin listesi ve onay akışı |
| `/izin/yeni` | Yeni izin talebi |
| `/mesai` | Mesai listesi |
| `/mesai/yeni` | Yeni mesai kaydı |
| `/giris-cikis` | Giriş-çıkış hareketleri |
| `/giris-cikis/qr` | QR kod yönetimi |
| `/qr-okut` | Kamera ile QR okutma |
| `/kart-sistemi` | PDKS kart yönetimi |
| `/kart-sistemi/cihazlar` | Cihaz (okuyucu) yönetimi |
| `/pdks-simulator` | PDKS simülasyonu (test) |
| `/raporlar` | Rapor kataloğu (Genel + Hesap sekmeleri) |
| `/vardiya` | Vardiya tanımları |
| `/vardiya/atama/:id` | Personel bazlı vardiya atama |
| `/calisma-planlari` | Haftalık çalışma planları |
| `/maas` | Maaş / bordro yönetimi |
| `/avans` | Avans talepleri |
| `/prim` | Prim listesi |
| `/cza-odul` | Ceza ve ödül kayıtları |
| `/zimmet` | Zimmet listesi |
| `/zimmet/yeni` | Yeni zimmet |
| `/gorevler` | Görev listesi |
| `/gorevler/yeni` | Yeni görev |
| `/gorevler/:id/duzenle` | Görev düzenleme |
| `/evrak` | Evrak listesi |
| `/evrak/yeni` | Yeni evrak |
| `/duyurular` | Duyuru listesi |
| `/duyurular/yeni` | Yeni duyuru |
| `/roller` | Rol ve yetki yönetimi |
| `/kullanicilar` | Kullanıcı yönetimi |
| `/islem-loglari` | Denetim logları |
| `/sistem-sagligi` | Sistem Sağlığı ve Olay İzleme (canlı radar, kritik banner, olay inceleme) |
| `*` | Bilinmeyen rota → anasayfaya yönlendirme |

### Menü Yapısı

Koyu tema sidebar üzerinde 8 bölüm, 24 menü öğesi. Her öğe ilgili yetkiye göre görünür:

* **Genel** — Panel
* **Personel** — Personel Listesi, Personel Ekle
* **Organizasyon** — Departman / Birim
* **İzin ve Puantaj** — İzin Yönetimi, Yeni İzin Talebi, Giriş-Çıkış, QR Kodlar, Kart Sistemi, Vardiyalar, Çalışma Planları
* **Raporlar** — Raporlar (çoklu yetki: `report:view` + ilgili modül yetkilerinden herhangi biri)
* **Ödeme** — Maaş / Bordro, Avanslar, Prim
* **İş Süreçleri** — Mesai, Mesai Ekle, Görev, Zimmet, Evrak, Disiplin ve Teşvik, Duyurular
* **Yönetim** — Roller ve Yetkiler, Kullanıcılar, İşlem Logları, Sistem Sağlığı

Üst bar bildirim çekmecesi, 30 saniyede bir okunmamış bildirimleri kontrol eder; tekil ve toplu okundu işaretleme desteklenir.

---

## Backend: API Modülleri

Backend'de 22 iş modülü bulunur:

| Modül | Rota | Sorumluluk |
|---|---|---|
| `auth` | `/api/auth/health`, `/api/auth/me` | Healthcheck + oturum sahibi bilgisi |
| `organization` | `/api/companies`, `/departments`, `/units`, `/work-locations`, `/titles`, `/positions` | Fabrika tabanlı 6 CRUD |
| `employees` | `/api/employees...` | Personel CRUD, görev geçmişi, durum değişikliği |
| `employee-record` | `/api/employee-records` | Ceza / ödül kayıtları |
| `leave` | `/api/leave-types`, `/api/leave-requests...` | İzin türleri, izin talepleri, onay akışı |
| `attendance` | `/api/attendance...`, `/api/attendance/qr-codes`, `/api/attendance/scan` | Giriş-çıkış, QR yönetimi ve tarama |
| `card` | `/api/card/scan`, `/credentials`, `/readers` | PDKS kartı ve cihaz yönetimi |
| `shift` | `/api/shifts`, `/api/shifts/assignments` | Vardiya tanımları ve atamalar |
| `payroll` | `/api/payroll...` | Bordro üretimi, maaş belirleme, onay akışı |
| `advance` | `/api/advances` | Avans talepleri |
| `bonus` | `/api/bonuses` | Prim kayıtları |
| `overtime` | `/api/overtimes` | Mesai kayıtları ve onay akışı |
| `task` | `/api/tasks` | Görev yönetimi ve yorumlar |
| `asset` | `/api/assets` | Zimmet yönetimi ve teslim/iade akışı |
| `document` | `/api/documents` | Evrak yönetimi |
| `announcement` | `/api/announcements` | Duyuru yönetimi ve okundu takibi |
| `notification` | `/api/notifications` | Sistem bildirimleri, okunmamış sayacı |
| `reports` | `/api/reports...` | Rapor uçları ve Excel/CSV çıktıları |
| `upload` | `/api/uploads` | Dosya yükleme (Supabase Storage) |
| `access` | `/api/permissions`, `/roles`, `/users` | Rol-yetki ve kullanıcı yönetimi |
| `audit` | `/api/audit-logs` | Denetim kayıtları |
| `monitoring` | `/api/monitoring...` | Sistem sağlığı kontrolleri, olay izleme, client-error raporlama ve ekip bildirimleri |

### Dikkat Çeken İş Mantığı

**Giriş-çıkış kaynakları:** `PunchSource` dört değer taşır: `PDKS`, `QR`, `MANUAL`, `CARD`. QR taraması otomatik giriş/çıkış kararı verir (son kayıt ÇIKIŞ değilse veya kayıt yoksa GİRİŞ, aksi halde ÇIKIŞ). QR kod `qr_` önekli rastgele token üreten, PNG data URL olarak döndürülür; `rotate` komutu eski kodu pasif edip aynı lokasyonda yenisi üretir; `expiresAt` geçmişse tarama reddedilir. `scan/self` ucu yalnızca oturum sahibinin personelini kullanır.

**İzin hesaplama:** İzin günü sayısı kapsayıcıdır (bitiş - başlangıç + 1). Aynı personelin PENDING/APPROVED izinleri tarih bazında çakışamaz. İzin türü kullanımda ise silinmez, `isActive = false` yapılır. Süt izni tek gün + yarım gün (SABAH / ÖĞLEDEN SONRA) ile sınırlıdır.

**Vardiya karşılaştırması:** Geç gelme / erken çıkma hesabı, o günkü atanmış vardiyanın başlangıç/bitiş saati esas alınır; atama yoksa varsayılan 09:00 / 18:00 kullanılır. Gece vardiyaları (başlangıç >= bitiş) atlanır.

**Bordro hesabı:** Aktif personeller üzerinden dönem bordrosu üretilir:

* Mesai tutarı = (taban maaş / 30 / 8) x onaylı mesai saati
* Ücretsiz izin kesintisi = (taban maaş / 30) x ücretsiz izin günü
* Brüt = taban maaş + mesai - kesinti + prim - diğer kesinti

Bordro durum akışı Taslak → Onaylandı → Ödendi şeklindedir; yalnızca Taslak düzenlenebilir ve onaylanabilir.

**Excel dışa aktarım:** Puantaj, giriş-çıkış logu, mesai ve izin raporları ExcelJS ile `.xlsx` üretir; diğer raporlar CSV (noktalı virgül + UTF-8 BOM, Türkçe Excel uyumlu) olarak indirilir.

**Dosya yükleme:** Frontend dosyayı base64 olarak gönderir; supabase storage `documents` bucket'ına yüklenir (kurulmamışsa public olarak otomatik oluşturulur). Azami boyut 10 MB; izin verilen MIME: pdf, jpeg, png, webp.

---

## Raporlar Kataloğu

`/raporlar` tek sayfadır; Genel ve Hesap olmak üzere iki sekmeli kart kataloğu, arama, tarih aralığı / ay / personel filtreleri içerir. Her rapor CSV veya Excel olarak dışa aktarılabilir.

### Genel Raporlar (19)

Giriş-çıkış listesi, geç kalanlar listesi, erken çıkanlar listesi, mesaiye kalanlar, devamsızlar, kart kullanmayanlar (giriş / çıkış / her ikisi), şu an içeridekiler, elle müdahale edilen hareketler, nöbet bilgileri (vardiya çizelgesi), irtibat bilgileri, işe girenler, işten ayrılanlar, tatil günü çalışanlar, izin kullananlar, avans listesi, prim listesi, aylık devam matrisi (P/İ/A).

### Hesap Raporları (5)

Puantaj hesaplama (kaydetmeden), genel maaş ekstresi, kişi bazında maaş ekstresi, maaş pusulası, grup bazlı (departman) maaş ekstresi.

---

## Kimlik Doğrulama ve Oturum Yönetimi

1. Kullanıcı e-posta + şifre ile `supabase.auth.signInWithPassword()` üzerinden giriş yapar.
2. Oturum açıldığında `supabase.auth.onAuthStateChange` dinlenir; token `lib/token.ts` üzerinden singletOn tutulur ve her API isteğine `Authorization: Bearer` başlığı olarak eklenir.
3. Backend token'ı Supabase admin istemcisi ile doğrular; kullanıcı `users.auth_id` üzerinden eşleşir, kayıt yoksa lazy-provisioning ile otomatik oluşturulur.
4. İlk girişte profil ve yetki kümesi çekilir; yetkisiz erişim menüde gizlenir, backend'de 403 ile engellenir. 401 dönerse `auth:expired` olayı tetiklenir ve oturum kapatılır.
5. Giriş sonrası 15 saniyelik arka plan ön yükleme motoru, dashboard ve ilgili verileri sıcak tutar (ilerleme çubuğu gösterilir).

### Beni Hatırla

Tarayıcı sekmesi/depolama tercihi `pik_remember_session` anahtarıyla saklanır:

* işaretli: `localStorage` — tarayıcı kapansa bile oturum korunur
* işaretsiz: `sessionStorage` — sekme kapanınca oturum sona erer

Supabase istemcisi seçilen depolama ile yeniden kurulur.

### Otomatik Çıkış

30 dakika hareketsizlik (mousemove, keydown, click, scroll, touchstart, pointerdown) sonrası otomatik çıkış yapılır.

### Şifremi Unuttum

Giriş ekranındaki akış `supabase.auth.resetPasswordForEmail()` ile sıfırlama bağlantısı gönderir (e-posta şablonu ve SMTP Supabase projesinde yapılandırılmış olmalıdır).

### Test ve Demo Giriş Bilgileri

Sistemde test ve video çekimlerinde kullanılmak üzere tüm modülleri dolu hazır kullanıcı hesapları:

| Rol | Ad Soyad | E-Posta / Kullanıcı Adı | Şifre | Görev / Yetki Tanımı |
|---|---|---|---|---|
| **Admin (Tam Yetki)** | **Eren KIRMIZI** | `eren.kirmizi@yenisehir.bel.tr` | `Bld.Admin2026!` | Bilgi İşlem / Tüm sistem yetkileri |
| **İK Uzmanı** | Fatma Demir | `fatma.demir@yenisehir.bel.tr` | `Bld.IK2026!` | İnsan Kaynakları Uzmanı (68 yetki) |
| **Birim Yöneticisi** | Mehmet Kaya | `mehmet.kaya@yenisehir.bel.tr` | `Bld.Mudur2026!` | Fen İşleri Müdürü (Birim onay yetkileri) |
| **Birim Yöneticisi** | Ayşe Şahin | `ayse.sahin@yenisehir.bel.tr` | `Bld.Mudur2026!` | Park ve Bahçeler Müdürü |
| **Standart Personel** | Ali Çelik | `ali.celik@yenisehir.bel.tr` | `Bld.Prsnl2026!` | Fen İşleri / Saha Teknikeri |
| **Standart Personel** | Zeynep Arslan | `zeynep.arslan@yenisehir.bel.tr` | `Bld.Prsnl2026!` | Fen İşleri / İnşaat Mühendisi |

> **Not:** Sistemdeki tüm standart personeller (Ali Çelik, Zeynep Arslan, Hasan Öztürk, Merve Kılıç, Emre Yıldız, Seda Güler, Kadir Aydın, Elif Çetin) için ortak şifre `Bld.Prsnl2026!` olarak belirlenmiştir.

---

## Yetkilendirme (RBAC)

Roller ve yetkiler ayrı kavramlardır; bir kullanıcı birden fazla role sahip olabilir, etkin yetki kümesi tüm rollerinin birleşimidir.

```
User --< UserRole >-- Role --< RolePermission >-- Permission
```

* Yetki kontrolü her istekte `users → user_roles → roles → role_permissions → permissions` zincirinden hesaplanır ve 3 dakika Upstash Redis'te cache'lenir.
* Kritik sorgularda birim/departman kapsamlama uygulanır: Birim yöneticisi yalnızca kendi birimine bağlı personel verilerine erişir.
* Sistem rolleri (`isSystem`) silinemez ve değiştirilemez.

### Seed Verileri

Seed betiği toplam **70 yetki** ve **4 rol** tanımlar:

| Rol | Kapsam |
|---|---|
| Admin | 70 yetkinin tamamı |
| İK Uzmanı | 70 yetkinin tamamı |
| Birim Yöneticisi | Personel, izin onay/red, mesai onay/red, puantaj, görev, vardiya, avans/prim onay, zimmet, evrak okuma, rapor, bildirim |
| Personel | İzin açma/okuma, mesai açma/okuma, puantaj okuma, görev okuma, vardiya okuma, avans açma, prim okuma, zimmet, evrak okuma, duyuru, bildirim |

Yetki kataloğu modüle göre şu kodlardan oluşur: `employee:read/write/delete`, `employee-record:read/write/delete`, `leave:read/create/approve/reject/write`, `overtime:read/create/approve/reject`, `payroll:read/write/approve`, `advance:read/write/approve`, `bonus:read/write/approve`, `asset:read/write/return/approve/delete`, `task:read/write/create/assign`, `document:read/write/create`, `announcement:read/write/create/publish`, `notification:read`, `report:view/create/export`, `attendance:read/write`, `qr:read/write/report`, `shift:read/write`, `company/department/unit/location/title/position:read/write`, `role:read/write`, `user:read/write`, `audit:read`, `monitoring:read/write`.

Ayrıca seed, örnek organizasyon verisi (1 kurum, 4 departman, 1 lokasyon, unvan ve pozisyonlar) ve 5 izin türü (yıllık 14 gün, mazeret 3 gün, rapor 5 gün, ücretsiz, süt izni) oluşturur.

---

## Veritabanı (Prisma)

Prisma 6 ile Supabase PostgreSQL'e bağlanılır. Şemada **40 model** bulunur:

**Organizasyon:** Company, Department, Unit, WorkLocation, Shift, ShiftAssignment, Title, Position

**Personel ve kullanıcı:** Employee, EmployeeHistory, User

**Rol ve yetki:** Role, Permission, RolePermission, UserRole

**İzin:** LeaveType, LeaveRequest

**Giriş-çıkış:** AttendanceRecord, CardCredential, CardCredentialLocation, CardReader, QrCode

**Maaş ve ödemeler:** PayrollItem, Advance, Bonus

**İş süreçleri:** EmployeeRecord (ceza/ödül), Asset, Task, TaskComment, Document

**Duyuru ve bildirim:** Announcement, AnnouncementEmployee, AnnouncementRead, Notification

**Denetim:** AuditLog

**İzleme ve Sistem Sağlığı:** Incident, IncidentOccurrence, HealthCheckResult, IncidentNotification

Önemli enum'lar: `PunchType` (IN/OUT), `PunchSource` (PDKS/QR/MANUAL/CARD), `EmploymentStatus` (ACTIVE/PASSIVE/SUSPENDED), `PayrollStatus` (DRAFT/APPROVED/PAID/CANCELLED), `AssetStatus` (ASSIGNED/PENDING_APPROVAL/REJECTED/RETURNED/RETURN_PENDING/LOST/DAMAGED/SERVICING), `LeaveStatus`, `OvertimeStatus`, `AdvanceStatus`, `BonusStatus`, `TaskPriority`, `TaskStatus`, `DocumentPriority`, `DocumentStatus`, `AnnouncementStatus`, `AnnouncementTargetType`, `ShiftDay`, `LeaveDayPart` (MORNING/AFTERNOON), `EmployeeRecordCategory`, `EmployeeRecordType`, `UserStatus`, `AuditResult`, `IncidentSeverity` (CRITICAL/ERROR/WARNING/INFO), `IncidentStatus` (OPEN/ACKNOWLEDGED/RESOLVED).

### Bağlantı Yapılandırması (Connection Pooler)

Serverless ortamda bağlantı havuzu tükenmesini önlemek için Supabase PgBouncer tabanlı pooler ve doğrudan bağlantı birlikte kullanılır:

```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler (6543) - runtime sorguları
  directUrl = env("DIRECT_URL")     // direct (5432) - migration'lar
}
```

`DATABASE_URL` uygulamanın normal çalışma zamanı sorguları için, `DIRECT_URL` ise yalnızca Prisma migration ve seed işlemleri için kullanılır.

---

## Performans

* **Upstash Redis:** JWT token doğrulama sonucu ve kullanıcının rol/yetki kümesi 3 dakika cache'lenir; her istekte iç Supabase çağrısı yapılmaz. Son giriş zamanı güncellemesi en fazla 1 saatte bir yazılır.
* **TanStack Query staleTime politikası:** Organizasyon verileri 30 dk, liste verileri 3 dk, detay verileri 5 dk, kısa vadeli veriler 1 dk; hassas veriler (maaş vb.) cache'lenmez. Sayfa değişiminde süregelen istekler AbortController ile iptal edilir.
* **Code-splitting ve prefetch:** Tüm sayfalar `React.lazy` ile ayrı chunk'tır. Giriş ekranı yüklenirken layout/dashboard chunk'ları önceden indirilir; girişten sonra 15 saniyelik derin ön yükleme uygulanır.
* **Supabase bölgesi:** `eu-central-1` (Frankfurt, Almanya) — Türkiye kullanıcılarına en yakın Supabase bölgesi. Migration üretimi ve uygulaması `DIRECT_URL` üzerinden yapılır.

---

## Ortam Değişkenleri

### Backend

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL bağlantı adresi (Connection Pooler, port 6543) |
| `DIRECT_URL` | Supabase PostgreSQL doğrudan bağlantı adresi (port 5432, migration için) |
| `SUPABASE_URL` | Supabase proje URL'i |
| `SUPABASE_ANON_KEY` | Supabase anonim/public anahtarı |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role anahtarı — yalnızca backend'de kullanılmalıdır |
| `SUPABASE_JWT_SECRET` | JWT doğrulama için kullanılan değer |
| `SUPABASE_JWT_JWKS` | İsteğe bağlı: asimetrik (ES256) doğrulama için JWKS JSON'u (Supabase Security > JWT Secrets) |
| `JWT_ISSUER` | JWT issuer adresi (`https://<ref>.supabase.co/auth/v1`) |
| `PORT` | Local backend portu (varsayılan 3000) |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis REST token |

### Frontend

| Değişken | Açıklama |
|---|---|
| `VITE_API_URL` | Backend API adresi (boşsa aynı origin kullanılır) |
| `VITE_SUPABASE_URL` | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonim/public anahtarı |

`SUPABASE_SERVICE_ROLE_KEY` kesinlikle frontend'e gönderilmemeli, `VITE_` önekiyle tanımlanmamalı ve Git'te commit edilmemelidir.

---

## Local Geliştirme

Gereksinimler: Node.js (workspace uyumlu), npm.

```bash
npm install                 # workspace bağımlılıklarını kur
npm run dev                 # backend (3000) + frontend birlikte başlat
npm run build               # tüm workspace'leri derle
npm run typecheck           # tüm workspace'lerde tsc kontrolü
```

Prisma:

```bash
npx prisma generate         # istemci üretimi
npx prisma migrate dev      # local migration (geliştirme ortamı)
npx prisma studio           # veritabanı görsel arayüzü
npm run seed --workspace apps/backend   # roller, yetkiler, örnek veri
```

Local ortamda backend `.env` dosyasında yukarıdaki backend değişkenleri, frontend `apps/frontend/.env` dosyasında `VITE_*` değişkenleri tanımlanır. Örnek şablon Kök `.env.example` dosyasıdır.

---

## Altyapı ve Deployment (Vercel)

### Canlı URL'ler

| URL | |
|-----|---|
| **https://personel-takip-app.vercel.app** | ⭐ Ana URL |
| https://personel-takip-tr.vercel.app | ✅ |
| https://personel-takip-v2.vercel.app | ✅ |
| https://personel-yonetim.vercel.app | ✅ |
| https://personel-sistemi.vercel.app | ✅ |

### Altyapı

* Frontend statik dosyalar olarak `apps/frontend/dist` çıktısından sunulur.
* Backend, `/api/*` istekleri için tek bir serverless fonksiyon olarak çalışır (`api/index.js`); ilk istekte Nest uygulaması hazırlanıp önbelleğe alınır. Azami süre 30 saniyedir.
* `vercel.json` içindeki rewrite kuralı: `/api/(.*)` backend fonksiyonuna, `/assets/(.*)` statik dosyalara, diğer tüm yollar `index.html`'e gider (SPA fallback).
* `/api/*` için CORS başlıkları tanımlıdır (Access-Control-Allow-Origin, Methods, Headers).
* CI/CD: `npm run build:vercel` komutu Prisma istemcisini üretir, backend ve frontend'i derler; Vercel proje ayarlarındaki environment değişkenleriyle deploys yapılır.

Prodüksiyon ortamında veritabanı şeması `DIRECT_URL` üzerinden yönetilir. Yeni migration gerektiğinde göç dosyası üretilir ve `prisma migrate deploy` ile uygulanır; `prisma migrate dev` prodüksiyonda kullanılmaz.

Ortam değişkenleri Vercel proje ayarlarında tanımlanır (backend + frontend değişkenleri birlikte; `VITE_*` öneki Vercel tarafında derleme anında frontend'e gömülür).

### Supabase Bölgesi

Veritabanı `eu-central-1` (Frankfurt, Almanya) bölgesindedir — Türkiye kullanıcıları için Singapore bölgesine kıyasla belirgin şekilde daha düşük latency sağlar.

Pooler host: `aws-1-eu-central-1.pooler.supabase.com`

---

## Güvenlik

Service Role anahtarı ile ilgili kurallar:

* Yalnızca backend ortamında tutulmalıdır.
* Frontend'e kesinlikle gönderilmemelidir.
* `VITE_` öneki kesinlikle kullanılmamalıdır.
* Git repository'sine commit edilmemelidir.

Frontend'de yalnızca anonim anahtar kullanılır:

```
VITE_SUPABASE_ANON_KEY=
```

`VITE_SUPABASE_SERVICE_ROLE_KEY` adında bir değişken tanımlanmamalıdır.

Ek kurallar:

* Sırlar yalnızca `.env` dosyasında tutulur (gitignored).
* Sunucu tarafında doğrulama yalnızca JWT ile yapılır; admin/anon istemci anahtarları doğrulama amacıyla kullanılmaz.
* QR kod içinde personel bilgisi bulunmaz; personel kimliği yalnızca oturumdan gelir.
* Kritik işlemler denetim loglarına IP ve user-agent bilgisiyle yazılır.

---

# Gereksinim Dokümanı

Bu bölüm, sistemin geliştirilmesine temel oluşturan iş gereksinimleridir.

## 1. Personel Yönetimi

Personellerin tüm özlük, çalışma, görev ve kurumsal bilgilerinin tek bir modül üzerinden yönetilebilmesi gerekmektedir. Personel ekranı, bilgi yoğunluğunu azaltmak amacıyla sekmeli veya bölümlendirilmiş bir yapıda tasarlanmalıdır.

Kullanıcı, personel seçtiğinde ilgili personelin temel bilgilerine ve yapılabilecek işlemlere adım adım ulaşabilmelidir.

### 1.1. Personel Listesi

Personel listesinde aşağıdaki bilgiler görüntülenebilmelidir:

* Personel fotoğrafı
* Adı ve soyadı
* Birimi / departmanı
* Personel unvanı
* Görev yeri
* Dahili telefon
* Kişisel telefon
* E-posta adresi
* Dış hat bilgisi
* Çalışma durumu (Aktif / Pasif)

Personeller aşağıdaki kriterlere göre filtrelenebilmelidir:

* Departman
* Birim
* Görev yeri
* Unvan
* Çalışma durumu

Personel listeleri hem tekil hem de toplu olarak görüntülenebilmeli ve raporlanabilmelidir.

### 1.2. Personel Detay Sayfası

Bir personelin üzerine tıklandığında, personelle ilgili tüm bilgiler tek bir ekran içerisinde ancak sekmeli veya bölümlendirilmiş şekilde görüntülenebilmelidir.

Personel detay ekranında aşağıdaki sekmeler bulunabilir:

* Genel Bilgiler
* Özlük Bilgileri
* İzinler
* Puantaj
* Maaş ve Prim
* Avanslar
* Mesai
* Görev Geçmişi
* Çalışma Planı
* Giriş-Çıkış Hareketleri
* Ceza / Ödül Bilgileri
* Yol Parası ve Diğer Ödemeler
* Zimmetler
* Evraklar
* Görevler
* Raporlar

Personel seçildiğinde ekranın üst bölümünde personelin;

* Fotoğrafı
* Adı ve soyadı
* Görevi
* Unvanı
* Birimi
* Görev yeri
* Çalışma durumu
* Son hareketleri
* Bekleyen işlemleri

özet olarak gösterilebilmelidir.

---

## 2. Personel Ekleme ve Kullanıcı Tanımlama

Yeni personel ekleme ekranından personelin hem kurumsal hem de kullanıcı hesabına ilişkin bilgileri tanımlanabilmelidir.

### 2.1. Kullanıcı Bilgileri

* Kullanıcı adı
* Şifre
* Şifre tekrarı
* Kullanıcı durumu
* Rol / Yetki tanımlaması

### 2.2. Personel Bilgileri

* Ad
* Soyadı
* Fotoğraf
* Görev
* Personel unvanı
* Birim / Departman
* Görev yeri
* İletişim bilgileri
* Diğer özlük bilgileri

Personel ile kullanıcı hesabı ilişkilendirilmeli ve personelin sistem üzerindeki işlemleri kendi kullanıcı hesabı üzerinden takip edilebilmelidir.

---

## 3. Departman, Birim ve Organizasyon Yapısı

Kurum bünyesindeki organizasyon yapısının hiyerarşik olarak tanımlanabilmesi gerekmektedir.

Sistem üzerinden aşağıdaki tanımlamalar yapılabilmelidir:

* Şirket / Kurum
* Departman
* Birim / Bölüm
* Servis
* Görev yeri
* Özel kod
* Personel unvanı
* Görev / pozisyon

Örneğin;

* Evlendirme Müdürlüğü
* Mezarlıklar Müdürlüğü
* Fen İşleri
* Park ve Bahçeler

gibi farklı birimlerde çalışan personeller ilgili departman ve birimlere atanabilmelidir.

Personel listeleri departman, birim veya görev yeri bazında filtrelenebilmelidir.

---

## 4. İzin Yönetimi

Personellerin izin süreçleri sistem üzerinden yönetilebilmelidir.

### 4.1. İzin Türleri

En az aşağıdaki izin türleri bulunmalıdır:

* Ücretli izin
* Ücretsiz izin
* Yıllık izin
* Mazeret izni
* Raporlu durum
* Devamsızlık
* Diğer izin türleri

### 4.2. İzin İşlemleri

Sistem üzerinden;

* İzin talebi oluşturma
* İzin onaylama
* İzin reddetme
* İzin geçmişini görüntüleme
* Kullanılan izinleri görüntüleme
* Kalan izin günlerini görüntüleme
* İzin raporları oluşturma

işlemleri yapılabilmelidir.

İzin işlemleri hem tek bir personel için hem de toplu personel seçilerek gerçekleştirilebilmelidir.

### 4.3. Personel İzin Talebi

Personeller kendi kullanıcı hesapları üzerinden izin talebi oluşturabilmelidir.

İzin talebi ekranında;

* İzin türü
* Başlangıç tarihi
* Bitiş tarihi
* İzin süresi
* Açıklama
* Gerekli durumlarda belge / rapor

alanları bulunmalıdır.

Oluşturulan izin talebi ilgili yöneticiye veya yetkili kullanıcıya iletilmeli ve;

* Beklemede
* Onaylandı
* Reddedildi

durumlarından biriyle takip edilebilmelidir.

Personel kendi izin taleplerinin durumunu görüntüleyebilmelidir.

---

## 5. Giriş-Çıkış ve PDKS Takibi

Personellerin işe giriş ve çıkış hareketleri sistem üzerinden takip edilebilmelidir.

Sistem aşağıdaki durumları raporlayabilmelidir:

* İşe giriş yapan personeller
* İşten çıkış yapan personeller
* Geç gelen personeller
* Erken çıkan personeller
* Fazla mesai yapan personeller
* Mesaiye kalan personeller
* İçeride bulunan personeller
* Devamsız personeller
* Tatil gününde çalışan personeller

Cihazlardan alınan giriş-çıkış verileri ilgili personelle eşleştirilmeli ve puantaj hesaplamalarında kullanılabilmelidir.

---

## 6. Puantaj Yönetimi

Personellerin günlük ve aylık çalışma durumları üzerinden puantaj hesaplaması yapılabilmelidir.

Puantaj içerisinde;

* Normal çalışma
* Fazla mesai
* Hafta tatili
* Resmî tatil çalışması
* İzin
* Ücretsiz izin
* Devamsızlık
* Rapor
* Geç gelme
* Erken çıkış
* Eksik çalışma

gibi durumlar takip edilebilmelidir.

Puantaj parametreleri günlük ve aylık olarak tanımlanabilmelidir.

---

## 7. Çalışma Planı ve Vardiya Yönetimi

Personellerin çalışma düzenlerinin yönetilebilmesi için çalışma planları oluşturulabilmelidir.

Sistem üzerinden;

* Genel çalışma planları
* Personel bazlı çalışma planları
* Vardiya tanımlamaları
* Günlük çalışma saatleri
* Haftalık çalışma düzenleri
* Tatil günleri
* Resmî tatiller
* İzin günleri

tanımlanabilmelidir.

Oluşturulan çalışma planı;

* Tek bir personele
* Birden fazla personele
* Personel grubuna
* Departmana
* Birime

toplu olarak atanabilmelidir.

İhtiyaç halinde tek bir personel için özel çalışma planı tanımlanabilmelidir.

---

## 8. Maaş, Prim ve Ödeme Yönetimi

Personellerin maaş ve ek ödeme süreçleri sistem üzerinden takip edilebilmelidir.

Aşağıdaki işlemler gerçekleştirilebilmelidir:

* Maaş hesaplama
* Prim hesaplama
* Avans tanımlama
* Fazla mesai ücreti hesaplama
* Hafta tatili ödemeleri
* Yol parası
* Ceza kesintileri
* Devreden tutarlar
* Diğer ek ödemeler
* Diğer kesintiler

Ek ödeme ve kesinti türleri personel seçilerek tekil veya toplu şekilde atanabilmelidir.

---

## 9. Toplu İşlemler

Personel modülünün temel özelliklerinden biri toplu işlem desteğidir.

Kullanıcı;

1. Tek bir personel seçerek işlem yapabilmeli,
2. Checkbox veya seçim alanı üzerinden birden fazla personel seçebilmeli,
3. Filtre sonucunda listelenen tüm personelleri seçebilmeli,
4. Seçilen personele toplu işlem uygulayabilmeli,
5. İşlem öncesinde gerekli onay ekranını görebilmeli,
6. İşlem sonrasında oluşan sonuçları görüntüleyebilmelidir.

Toplu işlem yapılabilecek başlıca alanlar:

* Maaş artışı
* Prim
* Avans
* Ödeme
* Kesinti
* Çalışma planı
* Vardiya
* İzin
* Departman değişikliği
* Birim değişikliği
* Görev yeri değişikliği
* Unvan değişikliği

Toplu işlemlerde yanlışlıkla işlem yapılmasını önlemek amacıyla işlem öncesinde seçilen personel sayısı ve uygulanacak işlem kullanıcıya gösterilmelidir.

---

## 10. Mesai Yönetimi

Personellere mesai eklenebilen ve mesai süreçlerinin yetkili kullanıcılar tarafından onaylanabildiği ayrı bir ekran bulunmalıdır.

### 10.1. Mesai Bilgileri

Mesai ekranında;

* Personel adı ve soyadı
* Personel fotoğrafı
* Görev yeri
* Birim / departman
* Bina adı
* Adres
* Mesai tarihi
* Mesai başlangıç saati
* Mesai bitiş saati
* Mesai süresi
* Mesai ücreti
* Açıklama

bilgileri görüntülenebilmelidir.

Personel seçildiğinde personelin fotoğrafı ve temel bilgileri otomatik olarak ekrana gelmelidir.

Ayrıca personelin geçmiş mesai hareketleri görüntülenebilmelidir.

### 10.2. Mesai Durumları

Mesai kayıtlarında;

* Beklemede
* Onaylandı
* Reddedildi

durumları bulunmalıdır.

Yetkili kullanıcılar kendi yetkileri kapsamında mesai kayıtlarını onaylayabilmeli veya reddedebilmelidir.

---

## 11. Görev Yönetimi

Personellere görev atanabilmesi ve görevlerin durumlarının takip edilebilmesi için ayrı bir görev yönetimi modülü bulunmalıdır.

### 11.1. Görev Oluşturma

Görev oluşturma ekranında;

* Görev başlığı
* Görev açıklaması
* Personel seçimi
* Öncelik
* Atanma tarihi
* Bitiş tarihi
* Görev durumu

alanları bulunmalıdır.

### 11.2. Görev Öncelikleri

Görev öncelikleri;

* Düşük
* Orta
* Yüksek

olarak tanımlanabilmelidir.

### 11.3. Görev Durumları

Görev durumları;

* Tamamlanmadı
* Devam ediyor
* Tamamlandı
* İptal edildi

şeklinde takip edilebilmelidir.

### 11.4. Görev Listesi

Görevler listelenirken aşağıdaki bilgiler görüntülenebilmelidir:

* Görev başlığı
* Personel
* Birim
* Öncelik
* Durum
* Atanma tarihi
* Bitiş tarihi

Görev listesinde arama alanı bulunmalı ve kullanıcı görevleri;

* Görev başlığına
* Personel adına
* Duruma
* Önceliğe
* Tarihe

göre arayabilmeli ve filtreleyebilmelidir.

Personeller kendi üzerlerine atanmış görevleri görüntüleyebilmelidir.

---

## 12. Görev Geçmişi

Personelin geçmişte yaptığı görevler ve görev değişiklikleri sistem üzerinden takip edilebilmelidir.

Personel detay ekranında;

* Önceki görevleri
* Mevcut görevi
* Görev başlangıç tarihi
* Görev bitiş tarihi
* Görev yeri
* Birim / departman değişiklikleri
* Unvan değişiklikleri

kronolojik olarak görüntülenebilmelidir.

---

## 13. Zimmet Yönetimi

Personellere kullanım amacıyla teslim edilen malzeme, ekipman ve teknolojik ürünlerin takip edilebilmesi için zimmet yönetimi modülü bulunmalıdır.

Zimmet kaydı oluşturulurken;

* Personel adı
* Malzeme türü
* Malzeme adı
* Marka
* Model
* Seri numarası
* Demirbaş / envanter numarası
* Teslim tarihi
* İade tarihi
* Durum
* Açıklama

bilgileri tutulmalıdır.

### 13.1. Zimmet Durumları

Zimmet durumu en az;

* Kullanılıyor
* İade edildi
* Kayıp
* Arızalı

şeklinde takip edilebilmelidir.

Personelin üzerine kayıtlı tüm zimmetler personel detay ekranındaki **Zimmetler** sekmesinden görüntülenebilmelidir.

Zimmet teslim ve iade işlemleri tarihçeli olarak tutulmalı ve hangi kullanıcının işlem yaptığı kayıt altına alınmalıdır.

---

## 14. Duyuru Yönetimi

Kurum içerisinde personellere toplu olarak bilgi aktarılabilmesi amacıyla duyuru yönetimi bulunmalıdır.

### 14.1. Duyuru Oluşturma

Duyuru oluşturulurken;

* Duyuru başlığı
* Duyuru içeriği
* Yayın tarihi
* Bitiş tarihi
* Duyuru durumu
* Hedef kitle

bilgileri tanımlanabilmelidir.

Duyurular;

* Tüm personele
* Departmana
* Birime
* Belirli personellere

gönderilebilmelidir.

### 14.2. Duyuruların Personellere Ulaşması

Yayınlanan duyurular hedeflenen kullanıcıların sistem içerisindeki duyuru alanında görüntülenebilmelidir.

Gerekli görülmesi halinde yeni duyuru için sistem içi bildirim oluşturulabilmelidir.

Personelin duyuruyu okuyup okumadığı takip edilebilmelidir.

---

## 15. Evrak Yönetimi

Kurum içerisinde gelen evrakların personel bazında takip edilebilmesi için evrak yönetimi modülü bulunmalıdır.

### 15.1. Evrak Bilgileri

Evrak kaydı oluşturulurken;

* Evrak numarası
* Evrak konusu
* Evrak içeriği / açıklaması
* Personel seçimi
* Tarih
* Öncelik
* Durum
* İşlem türü
* Gelen evrak tarihi
* Son işlem tarihi
* İlgili birim
* Ek belge / dosya

bilgileri tutulabilmelidir.

### 15.2. Evrak Öncelikleri

* Düşük
* Normal
* Yüksek
* Acil

gibi öncelik seviyeleri tanımlanabilmelidir.

### 15.3. Evrak Durumları

* Beklemede
* İşlemde
* Tamamlandı
* İptal edildi

gibi durumlar kullanılabilmelidir.

Evraklar personel, evrak numarası, konu, tarih, durum ve öncelik kriterlerine göre aranabilmeli ve filtrelenebilmelidir.

---

## 16. İşe Giriş ve İşten Çıkış Takibi

Personellerin işe giriş ve işten ayrılış süreçleri sistem üzerinden takip edilebilmelidir.

Raporlama ekranında;

* Yeni işe başlayan personeller
* İşten ayrılan personeller
* Belirli tarih aralığında işe girenler
* Belirli tarih aralığında işten ayrılanlar
* Aktif personeller
* Pasif personeller

listelenebilmelidir.

İşe giriş ve işten çıkış işlemleri personelin görev geçmişi ve özlük bilgileriyle ilişkilendirilmelidir.

---

## 17. Mobil QR ile Giriş-Çıkış ve Personel Doğrulama

Personellerin mobil cihazları üzerinden giriş-çıkış yapabilmesi için QR kod tabanlı bir yapı oluşturulmalıdır.

### 17.1. QR Kullanım Senaryosu

Sistemde her lokasyon veya giriş noktası için tek bir QR kod bulunabilir.

Tüm personeller aynı QR kodu kullanabilir.

Personelin işlem yapabilmesi için:

1. Personel kendi cep telefonundan kurumun web sitesine girer.
2. Kullanıcı adı ve şifresiyle sisteme giriş yapar.
3. **QR Okut** ekranına geçer.
4. Fiziksel ortamda bulunan ortak QR kodu telefon kamerasıyla okutur.
5. Sistem QR kodun geçerliliğini kontrol eder.
6. İşlem, sisteme giriş yapan personelin hesabı üzerinden gerçekleştirilir.
7. Giriş / çıkış tarihi ve saati otomatik olarak kaydedilir.
8. Oluşan kayıt puantaj ve giriş-çıkış hesaplamalarında kullanılır.

### 17.2. QR Kod Yapısı

QR kod içerisinde doğrudan personel bilgisi bulunmamalıdır.

QR kod yalnızca ilgili;

* Lokasyonu
* Giriş noktasını
* Cihazı

temsil etmelidir.

Personel bilgisi QR kodu okutan kullanıcının oturumundan alınmalıdır.

Örneğin:

**QR Kodu → Giriş Noktası A**

Personel 1:

**Personel 1 → Giriş Noktası A → 08:01 → Giriş**

Personel 2:

**Personel 2 → Giriş Noktası A → 08:05 → Giriş**

şeklinde ayrı kayıtlar oluşturulmalıdır.

### 17.3. QR İşlem Kayıtları

Her QR işlemi için;

* Personel
* Personel kullanıcı hesabı
* Tarih
* Saat
* İşlem tipi
* QR kod
* Lokasyon
* Cihaz bilgisi
* İşlem durumu
* Gerekli görülmesi halinde konum bilgisi

kayıt altına alınmalıdır.

### 17.4. Giriş / Çıkış Kontrolü

Sistem personelin mevcut çalışma durumunu kontrol ederek işlem tipini belirleyebilmelidir.

Örneğin:

**İlk QR okutma → Giriş**

**İkinci QR okutma → Çıkış**

Ancak vardiyalı çalışma, ara dinlenme ve farklı çalışma modelleri için bu davranış yönetilebilir olmalıdır.

### 17.5. QR Güvenliği

QR kodun tek başına personel doğrulaması yapmasına izin verilmemelidir.

Personelin kendi kullanıcı hesabıyla giriş yapması zorunlu olmalıdır.

Ek güvenlik kontrolleri olarak;

* Oturum kontrolü
* QR aktif / pasif kontrolü
* Lokasyon kontrolü
* İşlem zamanı
* Cihaz bilgisi
* Gerekli görülmesi halinde konum doğrulaması
* Olağan dışı işlemlerin loglanması

uygulanabilmelidir.

### 17.6. QR ve Puantaj Entegrasyonu

QR üzerinden oluşturulan giriş-çıkış kayıtları doğrudan giriş-çıkış ve puantaj modülüyle entegre çalışmalıdır.

Bu kayıtlar kullanılarak;

* Geç kalma
* Erken çıkış
* Normal çalışma süresi
* Fazla mesai
* Eksik çalışma
* Devamsızlık
* Vardiya uyumu
* Günlük puantaj
* Aylık puantaj

hesaplanabilmelidir.

### 17.7. QR Yönetim Ekranı

Yöneticilerin QR kodları yönetebileceği ayrı bir ekran bulunmalıdır.

Bu ekrandan;

* QR kod oluşturma
* QR kodu aktif / pasif yapma
* Lokasyon tanımlama
* Giriş noktası tanımlama
* QR kullanım hareketlerini görüntüleme
* QR giriş-çıkışlarını raporlama

işlemleri yapılabilmelidir.

---

## 18. Raporlama Yönetimi

Sistem kapsamlı ve filtrelenebilir raporlama özelliklerine sahip olmalıdır.

Raporların tamamında mümkün olduğunca;

* Tarih aralığı
* Personel
* Departman
* Birim
* Görev yeri
* Unvan
* Durum
* Diğer ilgili kriterler

üzerinden filtreleme yapılabilmelidir.

### 18.1. Özlük Raporları

* Genel özlük raporu
* Personel bazlı özlük raporu
* Departman bazlı personel raporu
* Birim bazlı personel raporu
* Aktif / pasif personel raporu
* Görev yeri bazlı personel raporu

### 18.2. İzin Raporları

* İzin kullanan personeller
* İzin türüne göre raporlama
* Kullanılan izinler
* Kalan izinler
* Tarih aralığına göre izin raporu
* Bekleyen izin talepleri
* Onaylanan / reddedilen izinler

### 18.3. Puantaj ve Maaş Raporları

* Genel maaş ekstresi
* Personel bazlı maaş ekstresi
* Maaş pusulası
* Grup bazlı maaş ekstresi
* Puantaj raporu
* Fazla mesai raporu
* Prim raporu
* Avans raporu
* Kesinti raporu

### 18.4. Çalışma Raporları

* Geç kalan personeller
* Erken çıkan personeller
* Fazla mesai yapanlar
* Hafta tatilinde çalışanlar
* Resmî tatilde çalışanlar
* İçeride bulunan personeller
* Devamsız personeller
* Giriş-çıkış hareketleri
* QR giriş-çıkış raporu

### 18.5. Görev Raporları

* Personel bazlı görev raporu
* Tamamlanan görevler
* Tamamlanmayan görevler
* Geciken görevler
* Önceliği yüksek görevler
* Departman bazlı görev raporu
* Tarih aralığına göre görev raporu

### 18.6. Zimmet Raporları

* Personel bazlı zimmet raporu
* Aktif zimmetler
* İade edilen zimmetler
* Zimmet türüne göre rapor
* Marka / model bazlı zimmet raporu
* Seri numarası bazlı zimmet sorgulama

### 18.7. Evrak Raporları

* Personel bazlı evrak raporu
* Gelen evrak raporu
* Bekleyen evraklar
* Tamamlanan evraklar
* Önceliğe göre evrak raporu
* Tarih aralığına göre evrak raporu

Raporlar gerektiğinde ekran üzerinde görüntülenebilmeli ve uygun formatlarda dışa aktarılabilmelidir.

---

## 19. Rol ve Yetki Yönetimi

Sistemde kullanıcıların erişebileceği ekranlar ve gerçekleştirebileceği işlemler roller ve yetkiler üzerinden kontrol edilmelidir.

Burada **rol** ve **yetki** birbirinden ayrı olarak tasarlanmalıdır.

### 19.1. Rol

Rol, kullanıcının sistem içerisindeki görev veya çalışma alanını temsil eder.

Örnek roller:

* Saha Etkisi
* Yatırım İzleme
* Genel
* Mesai Denetimi
* Mesai Onaylama
* Mesai Tanımlama
* Ekip Koordinatörü
* Araç Yakıt Veri Girişi
* Stok Yönetimi
* Birim Yöneticisi
* Çağrı Merkezi
* Anket Yönetimi
* Rapor Yönetimi
* Admin

### 19.2. Yetki

Yetki, kullanıcının sistem içerisinde gerçekleştirebileceği belirli işlemi ifade eder.

Örneğin;

* Personel görüntüleme
* Personel ekleme
* Personel düzenleme
* Personel silme
* İzin görüntüleme
* İzin talebi oluşturma
* İzin onaylama
* İzin reddetme
* Mesai görüntüleme
* Mesai tanımlama
* Mesai onaylama
* Mesai reddetme
* Maaş görüntüleme
* Maaş düzenleme
* Görev oluşturma
* Görev atama
* Görev görüntüleme
* Zimmet ekleme
* Zimmet iade alma
* Evrak oluşturma
* Evrak görüntüleme
* Duyuru oluşturma
* Duyuru yayınlama
* Rapor görüntüleme
* Rapor oluşturma
* Rapor dışa aktarma

gibi yetkiler tanımlanabilmelidir.

### 19.3. Rol - Yetki İlişkisi

Bir role birden fazla yetki atanabilmeli ve bir yetki birden fazla rolde kullanılabilmelidir.

Örneğin:

**Mesai Onaylama Rolü**

Bu role;

* Mesai görüntüleme
* Mesai detaylarını görüntüleme
* Mesai onaylama
* Mesai reddetme
* Mesai geçmişini görüntüleme

yetkileri atanabilir.

Kullanıcı sisteme kendi hesabıyla giriş yaptığında yalnızca rolüne ve yetkilerine izin verilen ekranları ve işlemleri görebilmelidir.

### 19.4. Yetki Kontrolü

Yetki kontrolü yalnızca frontend tarafında yapılmamalıdır.

Hem frontend hem de backend tarafında yetki kontrolü uygulanmalıdır.

Örneğin bir kullanıcı **Mesai Onaylama** yetkisine sahipse mesai kayıtlarını görüntüleyip onaylayabilir.

Ancak **Maaş Yönetimi** yetkisine sahip değilse maaş ekranına erişememeli ve backend üzerinden de maaş verilerine erişememelidir.

### 19.5. Birim Bazlı Yetkilendirme

Yetkilendirme gerektiğinde yalnızca işlem türüne göre değil, personelin bağlı olduğu birim veya departmana göre de sınırlandırılabilmelidir.

Örneğin:

**Birim Yöneticisi**

kendi birimine bağlı personellerin;

* İzin taleplerini
* Mesai kayıtlarını
* Görevlerini
* Çalışma planlarını

görüntüleyebilir ve kendisine tanımlanan yetkiler kapsamında onaylayabilir.

Bu sayede kullanıcı yalnızca yetkili olduğu alan ve personeller üzerinde işlem yapabilir.

---

## 20. Kullanıcı Deneyimi ve Ekran Tasarımı

Personel modülünde temel amaç, çok fazla bilginin tek bir ekranda gösterilmesi yerine sade, akıcı ve bölümlendirilmiş bir kullanıcı deneyimi sunmaktır.

Personel detay ekranı aşağıdaki gibi sekmelere ayrılabilir:

**Genel Bilgiler | Özlük | İzinler | Puantaj | Maaş | Mesai | Giriş-Çıkış | Görevler | Görev Geçmişi | Çalışma Planı | Zimmetler | Evraklar | Raporlar**

Personel seçildiğinde üst bölümde personelin temel bilgileri gösterilmeli, detay işlemler ilgili sekmeler üzerinden yönetilmelidir.

Liste ekranlarında mümkün olduğunca;

* Arama
* Filtreleme
* Sıralama
* Sayfalama
* Tekil seçim
* Çoklu seçim
* Tümünü seçme
* Toplu işlem

özellikleri bulunmalıdır.

---

## 21. Bildirim ve İşlem Takibi

Sistemde kullanıcıların bekleyen işlemlerden haberdar olabilmesi için bildirim mekanizması bulunmalıdır.

Kullanıcıya;

* Yeni izin talebi
* İzin onayı / reddi
* Yeni görev
* Görev bitiş yaklaşması
* Yeni duyuru
* Yeni evrak
* Evrak işlem beklemesi
* Mesai onay talebi
* Zimmet teslim / iade işlemleri

gibi durumlarda sistem içi bildirim gösterilebilmelidir.

Bildirimler kullanıcının rol ve yetkilerine göre oluşturulmalıdır.

---

## 22. İşlem Geçmişi ve Loglama

Personel ve insan kaynakları modülünde gerçekleştirilen kritik işlemler kayıt altına alınmalıdır.

Özellikle;

* Personel bilgilerinin değiştirilmesi
* Maaş değişikliği
* İzin onayı / reddi
* Mesai onayı / reddi
* Görev ataması
* Zimmet teslimi / iadesi
* Evrak işlemleri
* Rol ve yetki değişiklikleri
* Toplu işlemler
* QR giriş / çıkış işlemleri

için işlem geçmişi tutulmalıdır.

Log kayıtlarında mümkün olduğunca;

* İşlemi yapan kullanıcı
* İşlem tarihi
* İşlem saati
* İşlem türü
* İlgili personel
* Önceki değer
* Yeni değer
* İşlem sonucu

bilgileri tutulmalıdır.

---

## 23. Genel Sistem İşleyişi

Personel ve İnsan Kaynakları modülünün genel işleyişi aşağıdaki temel yapı üzerine kurulmalıdır:

**Personel → Kullanıcı Hesabı → Rol → Yetkiler → Birim / Departman → İşlemler → Onay Süreçleri → Raporlama**

Personelin sistem içerisindeki tüm işlemleri kendi kullanıcı hesabı üzerinden takip edilebilmelidir.

Yönetici kullanıcılar ise sahip oldukları rol ve yetkilere göre ilgili ekranlara erişebilmelidir.

Örneğin:

**Mesai Yöneticisi**

sisteme kendi hesabıyla giriş yaptığında;

* Mesai kayıtlarını görüntüleyebilmeli,
* Bekleyen mesaileri görebilmeli,
* Mesai detaylarını inceleyebilmeli,
* Yetkisi varsa mesaiyi onaylayabilmeli,
* Yetkisi varsa mesaiyi reddedebilmeli,
* Mesai raporlarını görüntüleyebilmeli,

ancak yetkisi bulunmayan maaş, stok veya diğer modüllere erişememelidir.

Bu yapı sayesinde sistemde her kullanıcı yalnızca görev alanıyla ilgili ekranlara ve işlemlere erişebilecek şekilde yönetilebilir.

---

## 24. Temel Modül Yapısı

Personel ve İnsan Kaynakları modülünün genel ekran yapısı aşağıdaki şekilde organize edilebilir:

### Personel

* Personel Listesi
* Personel Ekle
* Personel Detay
* Özlük Bilgileri
* Görev Geçmişi
* İşe Giriş / İşten Çıkış

### İzin ve Puantaj

* İzin Yönetimi
* İzin Talepleri
* Puantaj
* Giriş-Çıkış
* QR Giriş-Çıkış
* Çalışma Planları
* Vardiyalar

### Maaş ve Ödemeler

* Maaş
* Prim
* Avans
* Kesintiler
* Yol Parası
* Diğer Ödemeler

### Mesai

* Mesai Tanımlama
* Mesai Listesi
* Mesai Onayları
* Mesai Raporları

### Görev

* Görev Listesi
* Görev Oluştur
* Görev Atama
* Görev Takibi
* Görev Raporları

### Zimmet

* Zimmet Listesi
* Zimmet Tanımlama
* Zimmet Teslim
* Zimmet İade
* Zimmet Raporları

### Evrak

* Gelen Evrak
* Evrak Oluştur
* Evrak Takibi
* Evrak Raporları

### Duyurular

* Duyuru Listesi
* Duyuru Oluştur
* Duyuru Yayınlama
* Duyuru Takibi

### Raporlar

* Personel Raporları
* İzin Raporları
* Puantaj Raporları
* Maaş Raporları
* Mesai Raporları
* Görev Raporları
* Zimmet Raporları
* Evrak Raporları
* Giriş-Çıkış Raporları

### Yönetim

* Kurum Tanımları
* Departmanlar
* Birimler
* Görev Yerleri
* Unvanlar
* Roller
* Yetkiler
* Kullanıcılar
* QR Kod Yönetimi
* İşlem Logları
* KVKK & Gizlilik Merkezi

---

## KVKK ve Kişisel Veri Güvenliği Yönetimi (2026 Standartları)

Personel Takip Sistemi, çalışanların kimlik, iletişim, özlük, izin, mesai, devamsızlık, maaş/ücret, vardiya ve QR kodlu giriş-çıkış hareketleri gibi yüksek hassasiyetli verilerini işlemektedir. Bu doğrultuda sistem, **6698 sayılı Kişisel Verilerin Korunması Kanunu**, **2024 Reformu (m. 9 Yurt Dışı Aktarımı)** ve **2026 yılı güncel Kurul İlke Kararları** ile tam uyumlu olarak yapılandırılmıştır.

### 1. Kurul İlke Kararları ile Uyum

* **2026/347 Sayılı İlke Kararı (Aydınlatma & Açık Rıza Ayrımı):**
  * Aydınlatma yükümlülüğü bir bilgilendirme işlemidir ve açık rızaya veya onay kutusuna (checkbox) bağlanamaz.
  * Giriş ekranında ve sistem içinde çalışanlara şeffaf aydınlatma sunulmuş; iş sözleşmesi (m. 5/2-c) ve hukuki yükümlülük (m. 5/2-ç) kapsamındaki veri işlemeler için zorunlu onay şartı kaldırılmıştır.
* **2026/921 Sayılı İlke Kararı (PDKS Biyometrik Veri Yasağı Taahhüdü):**
  * Çalışan mesai ve giriş-çıkış takibinde **parmak izi, yüz tanıma, avuç içi veya iris taraması gibi biyometrik veriler kesinlikle işlenmemektedir**.
  * PDKS süreçleri ölçülülük ilkesi gereği **dinamik QR kod**, RFID kart/anahtarlık ve amir onay mekanizmaları ile yürütülür.
* **2024 KVKK m. 9 Yurt Dışı Veri Aktarımı Reformu & SCC:**
  * Supabase PostgreSQL (Frankfurt / eu-central-1), Upstash Redis ve Vercel Edge ile veri işleme sözleşmeleri (DPA) ve Kişisel Verileri Koruma Kurulu'nun yayımladığı **Standart Sözleşmeler (Standard Contractual Clauses - SCC)** güvenceleri uygulanmaktadır.

### 2. Veri Envanteri ve Saklama Standartları

Sistemdeki 36 Prisma veri tablosunun 25'i doğrudan kişisel veri içermektedir (`docs/kvkk/VERI_ISLEME_ENVANTERI.md`):

| Veri Kategorisi | Veritabanı Modelleri | Yasal Dayanak | Saklama Süresi | İmha / Tahliye |
|---|---|---|---|---|
| **Kimlik & Özlük** | `Employee`, `EmployeeHistory`, `Title` | 4857 s. İş Kanunu m. 75, TBK m. 146 | İşten Ayrılma + 10 Yıl | Anonimleştirme / Silme |
| **Bordro & Finans** | `PayrollItem`, `Salary`, `Bonus`, `Advance` | 213 s. VUK m. 253, 6102 s. TTK m. 82 | 10 Yıl | Kriptografik Silme |
| **İzin & Devamsızlık** | `LeaveRequest`, `LeaveType` | 4857 s. İş Kanunu m. 53-60 | 5 Yıl | Veritabanından Silme |
| **Giriş-Çıkış (PDKS)** | `AttendanceRecord`, `CardCredential` | İşyeri Güvenliği & Çalışma Süreleri | 2 Yıl | Periyodik İmha |
| **QR Kodlar** | `QrCode` | Dinamik Oturum Güvenliği | 24 Saat | Otomatik Expire |
| **Önbellek Verileri** | Upstash Redis | Performans / TTL | 3 Dakika - 24 Saat | Bellekten Tahliye (TTL) |

### 3. İlgili Kişi Hakları ve 30 Günlük SLA Takibi (KVKK m. 11 & m. 13)

* **Taşınabilirlik (Verilerimi İndir):** Çalışanlar sol menüdeki **"KVKK & Gizlilik"** merkezinden tek tıklamayla adlarına kayıtlı kimlik, oturum ve sistem dökümlerini `JSON` formatında indirebilir.
* **Talep Yönetimi & 30 Günlük SLA:** Çalışanlar bilgi alma (m.11/1-b), düzeltme (m.11/1-d), silme (m.11/1-e) ve aktarılan kişileri öğrenme (m.11/1-ç) taleplerini sistem üzerinden resmi başvuru olarak iletebilir. Her başvuru için kanuni **30 günlük SLA geri sayım sayacı** işletilir.

### 4. Ayrıntılı KVKK Belgeleri (`docs/kvkk/`)

Kurum içi denetim ve resmi yazışmalarda kullanılmak üzere oluşturulmuş doküman paketi:
1. [`docs/kvkk/AYDINLATMA_METNI.md`](docs/kvkk/AYDINLATMA_METNI.md) — 2026/347 & 2026/921 uyumlu resmi çalışan aydınlatma metni.
2. [`docs/kvkk/VERI_ISLEME_ENVANTERI.md`](docs/kvkk/VERI_ISLEME_ENVANTERI.md) — Tüm Prisma tablolarının VERBİS uyumlu veri envanteri matrisi.
3. [`docs/kvkk/SAKLAMA_VE_IMHA_POLITIKASI.md`](docs/kvkk/SAKLAMA_VE_IMHA_POLITIKASI.md) — Yasal saklama süreleri, periyodik imha ve anonimleştirme prosedürleri.
4. [`docs/kvkk/YURT_DISI_AKTARIM_POLITIKASI.md`](docs/kvkk/YURT_DISI_AKTARIM_POLITIKASI.md) — Supabase, Upstash Redis ve Vercel için SCC taahhütleri.
5. [`docs/kvkk/ILGILI_KISI_BASVURU_REHBERI.md`](docs/kvkk/ILGILI_KISI_BASVURU_REHBERI.md) — 30 günlük yasal başvuru yönetimi iş akışı.
6. [`docs/kvkk/VERI_IHLALI_PROSEDURU.md`](docs/kvkk/VERI_IHLALI_PROSEDURU.md) — 72 saatlik Kişisel Verileri Koruma Kurulu bildirim prosedürü.

---

## Notlar

* Ayrıntılı mimari bilgisi için `docs/ARCHITECTURE.md`, rol-yetki katalogu için `docs/RBAC.md` dosyalarına bakınız.
* Yasal veri koruma ve KVKK prosedürleri için `docs/kvkk/` altındaki belgelere başvurunuz.
* Şema değişiklikleri `prisma/migrations` altında tutulur; prodüksiyonda göçler `prisma migrate deploy` ile uygulanır.
