# Personel Takip Sistemi — Güvenlik ve Mantık Hataları Bulguları (Findings)
**Standart:** OWASP ASVS 5.0.0 & OWASP API Security Top 10:2023  
**Sürüm:** v1.0.0 (Tespit ve Kanıtlama)

---

### [SEC-001] Broken Object Level Authorization (BOLA/IDOR) — Personel Detayı
- **Seviye:** YÜKSEK (P1)
- **Konum:** `apps/backend/src/modules/employees/employees.controller.ts` (`GET /employees/:id`) ve `employees.service.ts` (`find(id)`)
- **Teknik Açıklama:** `list()` metodunda `employeeEntityScopedWhere` ile kullanıcının rolüne göre (birim yöneticisi sadece kendi birimini görür) filtreleme yapılırken, `find(id)` doğrudan `prisma.employee.findUnique({ where: { id } })` çağırmaktadır.
- **Saldırı Senaryosu:** Fen İşleri birim yöneticisi, bilinen veya tahmin edilen bir Park Bahçeler müdürünün `employeeId` değerini `GET /api/employees/:id` endpoint'ine göndererek başka birimin personelinin tüm özlük ve geçmiş detaylarına erişebilir.
- **OWASP Eşleşmesi:** API1:2023 (BOLA) / A01:2025 (Broken Access Control)
- **Önerilen Minimal Düzeltme:** `find()` metoduna `@CurrentUser() user: AuthenticatedUser` parametresi eklenmeli ve `employeeEntityScopedWhere` veya departman kontrolü ile doğrulanmalıdır.

---

### [SEC-002] Broken Object Level Authorization (BOLA/IDOR) — Maaş ve Ücret Bilgisi
- **Seviye:** KRİTİK (P0)
- **Konum:** `apps/backend/src/modules/payroll/payroll.controller.ts` (`GET /payroll/employees/:employeeId/salary`)
- **Teknik Açıklama:** Endpoint yalnızca `payroll:read` yetki kodunu kontrol etmektedir. Kullanıcının kendi maaşını mı okuduğu yoksa başka bir personelin maaşını mı okuduğu kontrol edilmemektedir.
- **Saldırı Senaryosu:** Kendi maaşını görme yetkisi (`payroll:read`) olan standart bir personel veya amir, parametredeki `employeeId` değerine kurum amirinin ID'sini yazarak amirinin güncel net/brüt maaş ve IBAN bilgilerini çekebilir.
- **OWASP Eşleşmesi:** API1:2023 (BOLA) / API3:2023 (BOPLA)
- **Önerilen Minimal Düzeltme:** Eğer kullanıcı `ADMIN` veya `HR` rolünde değilse, parametredeki `employeeId` ile `user.employeeId` eşleşmek zorundadır. Aksi halde `403 Forbidden` fırlatılmalıdır.

---

### [SEC-003] Broken Object Level Authorization (BOLA/IDOR) — İzin Talebi ve Sağlık Raporları
- **Seviye:** YÜKSEK (P1)
- **Konum:** `apps/backend/src/modules/leave/leave.controller.ts` (`GET /leave-requests/:id`)
- **Teknik Açıklama:** `findRequest(id)` metodu talep sahibini veya talep amirini doğrulamadan izin talebini (rapor ve mazeret gerekçesi dahil) döndürmektedir.
- **Saldırı Senaryosu:** Çalışan A, Çalışan B'nin sağlık izni talebini ve doktor raporu URL'sini ID üzerinden okuyabilir (KVKK sağlık verisi ihlali).
- **OWASP Eşleşmesi:** API1:2023 (BOLA)
- **Önerilen Minimal Düzeltme:** Talep sahibi (`employeeId === user.employeeId`), talep amiri (aynı departman yöneticisi) veya Admin/HR harici erişimler engellenmelidir.

---

### [SEC-004] Yetki Aşımı (Impersonation) — Başkası Adına İzin Başvurusu Açma
- **Seviye:** YÜKSEK (P1)
- **Konum:** `apps/backend/src/modules/leave/leave.service.ts` (`createRequest`)
- **Teknik Açıklama:** `dto.employeeId` değeri kullanıcının kimliğiyle karşılaştırılmamaktadır. Sadece `isAdmin` kontrolü çakışma (overlap) için kullanılmaktadır.
- **Saldırı Senaryosu:** `leave:create` yetkisi olan herhangi bir personel, `employeeId` alanına başka bir iş arkadaşının ID'sini yazarak onun adına sistemde izin talebi açabilir.
- **OWASP Eşleşmesi:** API1:2023 & API5:2023
- **Önerilen Minimal Düzeltme:** Eğer `actor` Admin veya HR değilse, `dto.employeeId` zorunlu olarak `actor.employeeId` olmalıdır.

---

### [SEC-005] Security Misconfiguration — Sınırsız CORS İzni
- **Seviye:** ORTA (P2)
- **Konum:** `apps/backend/src/main.ts` (`cors: true`)
- **Teknik Açıklama:** CORS ayarı `true` olarak bırakılmıştır; bu durum tüm origin'lerden gelen isteklere izin verir.
- **Önerilen Minimal Düzeltme:** Prodüksiyon ortamında `cors` ayarı yalnızca izin verilen alan adlarına (örneğin `personel-takip-sigma.vercel.app` ve yerel geliştirme portlarına) sınırlandırılmalıdır.

---

### [SEC-006] Eksik Güvenlik Başlıkları (Security Headers)
- **Seviye:** ORTA (P2)
- **Konum:** `apps/backend/src/main.ts`
- **Teknik Açıklama:** `helmet` kütüphanesi aktif edilmemiştir. `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security (HSTS)` gibi tarayıcı güvenlik başlıkları eksiktir.
- **Önerilen Minimal Düzeltme:** `helmet` middleware'i `main.ts` içerisine eklenmelidir.

---

### [SEC-007] Eksik Hız Sınırı (Rate Limiting) & Kaynak Tüketimi
- **Seviye:** ORTA (P2)
- **Konum:** `apps/backend/src/app.module.ts`
- **Teknik Açıklama:** `@nestjs/throttler` veya Redis tabanlı bir rate limiter bulunmamaktadır. Oturum açma veya yoğun veri sorgulama uçları kaba kuvvet (brute-force) veya DoS saldırılarına açıktır.
- **Önerilen Minimal Düzeltme:** Hassas API ve auth uçlarına makul hız limitleri (ör. dakikada 60 istek) tanımlanmalıdır.

---

### [SEC-008] Prodüksiyonda Swagger Dokümantasyonunun Açık Olması
- **Seviye:** DÜŞÜK / BİLGİ (P3)
- **Konum:** `apps/backend/src/main.ts`
- **Teknik Açıklama:** `SwaggerModule.setup('api/docs', app, document)` prodüksiyon ortamında da aktif kalmaktadır. Saldırganlara tüm endpoint haritasını sunar.
- **Önerilen Minimal Düzeltme:** `NODE_ENV === 'production'` durumunda Swagger devre dışı bırakılmalı veya yetkili kullanıcılara sınırlandırılmalıdır.
