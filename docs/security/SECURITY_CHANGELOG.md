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

---

### [FIX-006] SEC-003b & SEC-004b — Mesai (Overtime) BOLA ve Yetkisiz Kayıt Engeli
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/overtime/overtime.controller.ts`
  - `apps/backend/src/modules/overtime/overtime.service.ts`
- **Yapılan İşlem:**
  1. `find(id)` çağrısında kullanıcının talep sahibi, birim amiri veya İK/Admin olup olmadığı denetlendi (BOLA koruması).
  2. `create` metodunda Admin/İK olmayan personelin başkası adına (`dto.employeeId !== actor.employeeId`) yetkisiz mesai talebi açması engellendi.
  3. `pageSize` sorgu parametresine `100` tavan sınırı uygulandı.
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-007] SEC-004c — Avans (Advance) Yetkisiz Talep Engeli & Sayfalama Sınırı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/advance/advance.controller.ts`
  - `apps/backend/src/modules/advance/advance.service.ts`
- **Yapılan İşlem:**
  1. `create` metodunda Admin/İK olmayan personelin başkası adına avans talebi oluşturması engellendi (`dto.employeeId === actor.employeeId` kuralı).
  2. `pageSize` sorgu parametresine `100` tavan sınırı uygulandı.
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-008] SEC-001b — Prim (Bonus) BOLA Kapsam Koruması & Sayfalama Sınırı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/bonus/bonus.controller.ts`
  - `apps/backend/src/modules/bonus/bonus.service.ts`
- **Yapılan İşlem:**
  1. `find(id)` çağrısında `getScope(actor)` ile birim ve sahip kontrolü sağlandı.
  2. `pageSize` sorgu parametresine `100` tavan sınırı uygulandı.
- **Doğrulama:** Backend build (`nest build`) 0 hata ile doğrulandı.

---

### [FIX-009] SEC-009 & PERF-002 — Evrak (Document) BOLA Yetkilendirmesi & Sayfalama Tavanı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/document/document.controller.ts`
  - `apps/backend/src/modules/document/document.service.ts`
- **Yapılan İşlem:**
  1. `find(id)` metoduna `@CurrentUser() user: AuthenticatedUser` eklendi. Yöneticilerin yalnızca kendi birimlerine ait evrakları, çalışanların ise yalnızca kendilerine ait evrakları okuyabilmesi sağlandı (`ForbiddenException`).
  2. `pageSize` parametresi maksimum `100` ile sınırlandırıldı.
- **Doğrulama:** Backend ve Frontend build 0 hata ile doğrulandı.

---

### [FIX-010] SEC-010 & PERF-003 — Görevler (Tasks) BOLA Scoping & Sayfalama Tavanı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/task/task.controller.ts`
  - `apps/backend/src/modules/task/task.service.ts`
- **Yapılan İşlem:**
  1. `find(id)` metoduna `@CurrentUser() user: AuthenticatedUser` eklendi. Kullanıcının görevin sahibi, oluşturanı veya departman amiri olduğu doğrulandı; yetkisiz erişimler engellendi.
  2. `pageSize` parametresi maksimum `100` ile sınırlandırıldı.
- **Doğrulama:** Backend ve Frontend build 0 hata ile doğrulandı.

---

### [FIX-011] SEC-011 — Raporlama Uçlarında BOLA & Kurumsal Veri Sızıntısı Engeli
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/reports/reports.controller.ts`
  - `apps/backend/src/modules/reports/reports.service.ts`
- **Yapılan İşlem:**
  1. `attendance`, `attendanceExcel`, `attendanceLog`, `attendanceLogExcel`, `overtimes`, `overtimeExcel`, `leaves`, `leaveExcel` metodlarına `@CurrentUser() user: AuthenticatedUser` entegre edildi.
  2. Tüm sorgular `employeeScopedWhere(actor, base)` ile filtrelendi; birim yöneticilerinin ve çalışanların tüm kurumun puantaj, mesai ve izin dökümlerini çekmesi engellendi.
- **Doğrulama:** Backend ve Frontend build 0 hata ile doğrulandı.

---

### [FIX-012] SEC-012 — Kartlı Geçiş (Card Scan) Sahte Kimlik (Impersonation) Engeli
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/card/card.service.ts`
- **Yapılan İşlem:**
  1. `scan` metodunda okutulan kartın yalnızca kart sahibi personel (`credential.employeeId`) adına geçiş basabilmesi garanti edildi; farklı bir `employeeId` ile yapılan istekler `ForbiddenException` ile reddedildi.
  2. `listCredentials` ve `listReaders` için `100` tavan sayfalama sınırı kondu.
- **Doğrulama:** Backend ve Frontend build 0 hata ile doğrulandı.

---

### [FIX-013] SEC-013 & PERF-004 — Dosya Yükleme Güvenlik Doğrulaması (Stored XSS Koruması) & Ek Sayfalama Tavanları
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/upload/upload.service.ts`
  - `apps/backend/src/modules/employee-record/employee-record.service.ts`
  - `apps/backend/src/modules/asset/asset.service.ts`
  - `apps/backend/src/modules/attendance/attendance.service.ts`
- **Yapılan İşlem:**
  1. `upload.service.ts` içinde MIME türü ve dosya uzantısı için katı beyaz liste (`ALLOWED_EXTS`: PDF, JPG, PNG, WEBP, DOCX, XLSX, CSV) uygulandı. Betik (`.html`, `.svg`, `.exe`, `.js`) yüklemeleri engellenerek Stored XSS ve zararlı yazılım riski ortadan kaldırıldı.
  2. `employee-record`, `asset` ve `attendance` (list, daily, qrCodes) sorgularına `100` tavan sayfalama sınırı uygulandı.
- **Doğrulama:** Backend ve Frontend build 0 hata ile doğrulandı.

---

### [FIX-014] SEC-014 — Anında Oturum & Yetki İptali (Immediate Revocation Cache Synchronization)
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/access/access.service.ts`
- **Yapılan İşlem:**
  1. `CacheService` entegre edilerek `setUserRoles`, `setUserStatus`, `setRolePermissions`, `updateRole` ve `removeRole` fonksiyonlarına anında önbellek temizleme (cache eviction) eklendi.
  2. Bir kullanıcının hesabı dondurulduğunda veya yetkisi alındığında Redis'teki oturumu sıfır gecikmeyle geçersiz kılınarak eski yetkilerini kullanması imkansız hale getirildi.
- **Doğrulama:** Backend ve Frontend derlemeleri 0 hata ile doğrulandı.

---

### [FIX-015] Duyuru (Announcement) Kapsam Denetimi ve Sayfalama Sınırı
- **Değiştirilen Dosyalar:**
  - `apps/backend/src/modules/announcement/announcement.controller.ts`
  - `apps/backend/src/modules/announcement/announcement.service.ts`
- **Yapılan İşlem:**
  1. `GET /announcements` uç noktasına `@CurrentUser() user` enjekte edildi; standart personelin taslak (`DRAFT`) duyuruları veya yayın tarihi gelmemiş duyuruları görmesi engellendi.
  2. Genel liste ve personel duyuru listelerine 100 tavan sayfalama sınırı uygulandı.
- **Doğrulama:** Backend ve Frontend derlemeleri 0 hata ile doğrulandı.


