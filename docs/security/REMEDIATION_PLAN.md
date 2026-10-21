# Personel Takip Sistemi — İyileştirme ve Güvenlik Sertleştirme Planı (Remediation Plan)
**Hedef:** Mevcut çalışan işleyişi %100 koruyarak doğrulanmış güvenlik açıklarını ve mantık hatalarını kontrollü adımlarla kapatmak.

---

## 1. Düzeltme İlkeleri ve Kurallar

1. **Sıfır Regresyon (Zero Regression):** Çalışan mevcut frontend ve API arayüzleri bozulmayacaktır.
2. **Minimal Müdahale:** İlgisiz refactor yapılmayacak; yalnızca açığı kapatan en küçük ve en güvenli kod bloğu eklenecektir.
3. **Önce Test, Sonra Onay:** Her yama lokal ortamda derlenecek ve test edilecektir.

---

## 2. Öncelikli Eylem Matrisi

| Öncelik | Bulgu ID | Alan | Hedef Dosya | Tahmini Efor |
|---|---|---|---|---|
| **P0 (Acil)** | **SEC-002** | Maaş BOLA/IDOR | `apps/backend/src/modules/payroll/` | Düşük / Yüksek Etki |
| **P1 (Yüksek)** | **SEC-001** | Personel Detay BOLA | `apps/backend/src/modules/employees/` | Düşük / Kritik Gizlilik |
| **P1 (Yüksek)** | **SEC-003** | İzin Raporu BOLA | `apps/backend/src/modules/leave/` | Düşük / KVKK Sağlık |
| **P1 (Yüksek)** | **SEC-004** | Başkası Adına İzin Açma | `apps/backend/src/modules/leave/` | Düşük / İş Mantığı |
| **P2 (Orta)** | **SEC-005** | CORS Sınırlandırması | `apps/backend/src/main.ts` | Çok Düşük |
| **P2 (Orta)** | **SEC-006** | Güvenlik Başlıkları (Helmet)| `apps/backend/src/main.ts` | Çok Düşük |
| **P3 (Bilgi)** | **SEC-008** | Prodüksiyon Swagger Kapatma | `apps/backend/src/main.ts` | Çok Düşük |

---

## 3. Adım Adım Düzeltme Planı

### Aşama 1: Kritik Yetkilendirme & BOLA Korumaları (SEC-001, SEC-002, SEC-003, SEC-004)
- **`SEC-002` (Maaş Koruma):** `payroll.controller.ts` içinde `getEmployeeSalary` çağrılırken `@CurrentUser() user: AuthenticatedUser` enjekte edilir. Eğer kullanıcı Admin veya HR değilse ve `user.employeeId !== employeeId` ise `ForbiddenException('Yalnızca kendi maaş bilginizi görüntüleyebilirsiniz.')` döner.
- **`SEC-001` (Personel Scoping):** `employees.controller.ts` `find(id)` metoduna `actor` verilir. `resolveScopeKind(actor)` birim yöneticisi ise personelin o birimde olduğu teyit edilir, aksi halde `ForbiddenException` döner.
- **`SEC-004` (İzin Başvurusu Sahiplik):** `leave.service.ts` içinde `actor` Admin veya HR değilse, `dto.employeeId` değeri otomatik olarak `actor.employeeId` ile eşitlenir. Başka personel adına izin açılması engellenir.

### Aşama 2: Web Güvenliği Sertleştirmesi (SEC-005, SEC-006, SEC-008)
- `main.ts` içine prodüksiyon origin kontrolü ve `helmet` entegrasyonu.
- `NODE_ENV === 'production'` durumunda Swagger'ın açık kalmaması.

### Aşama 3: Performans ve Query Güvenliği (PERF-001)
- Tüm liste filtrelerinde `pageSize` için tavan sınır (örnek: `Math.min(dto.pageSize || 20, 100)`) uygulanarak veritabanı kilitlenmelerinin (resource exhaustion) önüne geçilmesi.

---

## 4. Geri Alma (Rollback) Güvencesi
Yapılacak tüm değişiklikler Git üzerinde atomic (tekil) commit'ler halinde saklanacaktır. Herhangi bir beklenmeyen davranış gözlenirse tek bir `git revert` komutu ile mevcut çalışan duruma anında geri dönülebilir.
