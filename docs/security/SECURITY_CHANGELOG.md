# Güvenlik ve Sertleştirme Değişiklik Günlüğü (Security Changelog)
**Tarih:** 21 Ekim 2026  
**Kapsam:** P0, P1, P2 Güvenlik Sertleştirmeleri & Mantık Hatalarının Giderilmesi

---

### [FIX-001] SEC-002 — Maaş ve Ücret BOLA/IDOR Koruması
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/payroll/payroll.controller.ts`
  - `apps/backend/src/modules/payroll/payroll.service.ts`
- **Yapılan İşlem:** `getEmployeeSalary` metoduna `@CurrentUser() user: AuthenticatedUser` eklendi. Kullanıcı Admin veya İK yetkisinde değilse, yalnızca kendi `actor.employeeId` değerine ait maaş kaydını sorgulayabilmesi sağlandı (`ForbiddenException`).
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-002] SEC-001 — Personel Detayı ve Geçmişi BOLA Koruması
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/employees/employees.controller.ts`
  - `apps/backend/src/modules/employees/employees.service.ts`
- **Yapılan İşlem:** `find(id)` ve `history(id)` metodlarına `actor: AuthenticatedUser` kapsam kontrolü entegre edildi. Birim yöneticilerinin yalnızca kendi birimlerine bağlı personelin detaylarını görebilmesi, standart personelin ise yalnızca kendi özlük detayını sorgulayabilmesi sağlandı.
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-003] SEC-003 & SEC-004 — İzin Talebi Yetki ve Başkası Adına Başvuru Engeli
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/leave/leave.controller.ts`
  - `apps/backend/src/modules/leave/leave.service.ts`
- **Yapılan İşlem:**
  1. `findRequest(id)` çağrısında kullanıcının talep sahibi, birim amiri veya İK/Admin olup olmadığı denetlendi.
  2. `createRequest` metodunda Admin/İK olmayan personelin başkası adına (`dto.employeeId !== actor.employeeId`) yetkisiz izin başvurusu açması engellendi.
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-004] SEC-005, SEC-006, SEC-008 — CORS, Güvenlik Başlıkları ve Swagger Sertleştirmesi
- **Değiştirilen Dosya:**
  - `apps/backend/src/main.ts`
- **Yapılan İşlem:**
  1. `cors: true` yerine izin verilen origin'ler (`localhost`, Vercel production ve preview domainleri) beyaz listeye (allowlist) alındı.
  2. OWASP ASVS uyumlu HTTP güvenlik başlıkları (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS) eklendi.
  3. `Swagger` dokümantasyonu yalnızca geliştirme ve staging ortamlarında çalışacak şekilde koşula bağlandı (`NODE_ENV !== 'production'`).
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-005] PERF-001 — Sınırsız Sayfalama (Unbounded Pagination) Kaynak Tüketim Sınırı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/employees/employees.service.ts`
  - `apps/backend/src/modules/payroll/payroll.service.ts`
  - `apps/backend/src/modules/leave/leave.service.ts`
- **Yapılan İşlem:** `pageSize` sorgu parametrelerine `Math.min(Math.max(1, query.pageSize ?? 20), 100)` tavan sınır koyularak veritabanı bellek ve CPU tükenmelerinin (DoS) önüne geçildi.
- **Doğrulama:** Backend ve frontend monorepo derlemeleri başarıyla tamamlandı.
