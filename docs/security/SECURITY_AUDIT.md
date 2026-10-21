# Personel Takip Sistemi — Güvenlik, Mantık Hataları ve Performans Denetimi (Audit)
**Standartlar:** OWASP Top 10:2025 · OWASP ASVS 5.0.0 · OWASP API Security Top 10:2023 · OWASP WSTG v4.2  
**Tarih:** Ekim 2026  
**Durum:** Faz 0 / Faz 1 (Read-Only Analiz & Durum Tespiti)

---

## 1. Mimari Güvenlik ve Güven Sınırları (Trust Boundaries)

Sistem aşağıdaki çok katmanlı mimari üzerinde çalışmaktadır:

```text
[ Browser / Mobil Cihaz ]
          │  (HTTPS / TLS 1.3)
          ▼
   [ Vercel CDN & Edge ]
          │  (Serverless Function Handler: api/index.js)
          ▼
   [ NestJS Backend Engine ]
     ├── JwtAuthGuard (Supabase Token Verification via Upstash Redis)
     ├── PermissionsGuard (RBAC 68 Yetki Kodu Kontrolü)
     ├── Prisma ORM 6
     └── AuditService (Kritik İşlem Loglama)
          │
     ┌────┴──────────────────────────┐
     ▼                               ▼
[ Upstash Redis ]         [ Supabase PostgreSQL ]
  (Frankfurt / AWS)         (Frankfurt / AWS / PgBouncer)
```

### Güven Sınırları (Trust Boundaries):
1. **İstemci ↔ API Sınırı (En Kritik Sınır):** İstemci (React SPA) tamamen güvenilmeyen bir ortamdır. Frontend'de bir butonun gizlenmiş olması veya menünün gösterilmemesi **asla bir güvenlik kontrolü değildir**. Tüm yetkilendirme (RBAC ve BOLA/IDOR kontrolleri) API tarafında doğrulanmalıdır.
2. **API ↔ Veritabanı Sınırı:** Prisma ORM parametreli sorgular kullandığı için klasik SQL Injection riski düşüktür; ancak doğrudan ID üzerinden yapılan sorgularda `tenant/department/employee scoping` uygulanmazsa nesne seviyesinde yetki aşımı (BOLA) meydana gelir.
3. **API ↔ Redis Cache Sınırı:** Upstash Redis bellek katmanında tutulan yetki ve profil verileri, kullanıcı rolü değiştiğinde veya oturum kapatıldığında stale (bayat) kalabilir (TTL: 3 dakika).

---

## 2. Saldırganlar Gerçekte Ne Yapar? (Saldırı Araçları & Yöntemleri)

Saldırganlar sisteminizi tararken web arayüzündeki formlara tıklamaz; aşağıdaki araçlarla doğrudan HTTP seviyesinde çalışırlar:

| Saldırgan Aracı | Saldırı Metodolojisi | Sistemde Nereyi Hedef Alır? |
|---|---|---|
| **Burp Suite / OWASP ZAP** | İstek ve yanıtları araya girip yakalama (Proxy) ve parametre manipülasyonu. | İzin, mesai, maaş taleplerinde `employeeId`, `status`, `role` alanlarını değiştirerek başka kullanıcı adına işlem yapma (BOLA/IDOR). |
| **Postman / cURL** | Frontend kontrollerini tamamen atlayarak API'ye ham JSON istekleri gönderme. | Giriş yapmadan veya kısıtlı yetkili personel token'ıyla `/api/employees/:id` veya `/api/payroll/...` çağırma. |
| **Mass Assignment Fuzzing** | Gönderilen JSON body'sine ekstra alanlar ekleme (`role: "ADMIN"`, `salary: 999999`). | `POST /employees`, `PATCH /employees/:id` gibi model güncelleme noktaları. |
| **Race Condition İstismarı** | Turbo Intruder ile aynı anda yüzlerce eşzamanlı istek yollama. | İzin hakkı kalmayan personelin aynı milisaniyede 2 istek atarak negatif bakiyeye düşmesi. |
| **ffuf / Gobuster** | API dizin ve gizli rota taraması (Wordlist tabanlı). | Açık unutulmuş test, debug veya dokümantasyon endpoint'leri (`/api/docs`, Swagger). |
| **DoS & Kaynak Tüketimi** | Aşırı büyük payload veya sınırsız pagination isteği. | `GET /api/employees?pageSize=999999` veya rapor sorguları ile veritabanını kilitleme. |

---

## 3. Load Balancer Kavramı ve Projedeki Gerçek Rolü

### Load Balancer Nedir?
Load Balancer (Yük Dengeleyici), gelen kullanıcı trafiğini arkasındaki birden fazla sunucuya (örneğin Server 1, Server 2, Server 3) dağıtan bir trafik yönlendiricisidir.

### Bu Projede Gerekli mi?
1. **Vercel Zaten Doğal Load Balancer'dır:** Projeniz Vercel üzerinde çalıştığı için gelen trafik doğrudan Vercel'in global Edge ağında karşılanır. Eşzamanlı 10.000 istek gelse bile Vercel arkadaki Node.js / NestJS serverless fonksiyonlarını **otomatik olarak çoğaltır (auto-scaling)**. Dolayısıyla harici bir Load Balancer (AWS ALB, NGINX vb.) kurmaya gerek yoktur.
2. **Asıl Darboğaz Neresi Olur?**
   - **Yavaş SQL Sorguları (N+1 Sorguları):** Bir personeli çekerken ilişkili birimleri, izinleri ve unvanları tek sorguda (`include`) çekmek yerine döngü içinde çekmek veritabanını kilitler.
   - **Connection Pool Limitleri (Supabase PgBouncer):** Çok sayıda Vercel serverless fonksiyonu aynı anda ayağa kalktığında PostgreSQL bağlantı havuzu dolabilir.
   - **Sonuç:** Veritabanı sorgusu 2 saniye sürüyorsa önüne 10 tane load balancer koysanız da sistem hızlanmaz. Çözüm: **Query optimizasyonu, doğru indexleme ve akıllı Redis önbelleklemedir**.

---

## 4. OWASP Top 10:2025 ve API Security Eşleşmesi

| OWASP 2025 Kodu | Kategori | Projedeki Durum & Değerlendirme |
|---|---|---|
| **A01:2025 / API1:2023** | Broken Access Control / BOLA | **YÜKSEK ÖNCELİK:** `GET /employees/:id`, `GET /payroll/employees/:id/salary` ve `GET /leave-requests/:id` uçlarında kullanıcı/departman kapsam denetimi eksiktir. |
| **A02:2025 / API8:2023** | Security Misconfiguration | **ORTA:** `cors: true` ile tüm origin'lere izin verilmiş, HTTP güvenlik başlıkları (Helmet) eksik, Swagger prodüksiyonda açık. |
| **A03:2025** | Software Supply Chain | **DİKKAT:** Bağımlılıklarda bilinen CVE'ler mevcut. Ancak `npm audit fix --force` NestJS 12 kırıcı sürümünü yükleyeceği için kontrollü yama yapılmalı. |
| **A04:2025** | Cryptographic Failures | **GÜVENLİ:** Şifreler Supabase Auth üzerinden kriptografik olarak hashlenmekte, TLS 1.3 ve şifreli JWT kullanılmaktadır. |
| **A05:2025** | Injection | **GÜVENLİ:** Prisma ORM parametreli sorgulama kullandığı için SQLi riski bertaraf edilmiştir. |
| **A06:2025** | Insecure Design | **İYİLEŞTİRİLECEK:** İş akışı state geçişleri (ör. onaylanmış iznin tekrar düzenlenememesi) servis katmanında tam olarak kilitlenmeli. |
| **A07:2025** | Authentication Failures | **GÜVENLİ:** Supabase Auth + Redis token doğrulaması sağlam. Ancak API endpoint'lerinde rate limit (istek sınırı) eksik. |
| **A08:2025** | Data Integrity Failures | **İYİLEŞTİRİLECEK:** Eşzamanlı izin başvurularında yarış koşulu (race condition) koruması için DB transaction uygulanmalı. |
| **A09:2025** | Logging & Alerting | **GÜÇLÜ:** `AuditService` kritik işlemleri veritabanına logluyor. Hassas PII verisi maskelenmeli. |
| **A10:2025** | Mishandling Exceptions | **GÜVENLİ:** `CacheService` Redis hatalarında fail-open değil güvenli null fallback yapıyor. |
