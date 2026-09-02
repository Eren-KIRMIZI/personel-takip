# RBAC Modeli

## Kavramlar

- **Permission (yetki):** Gerçekleştirilebilir en küçük işlem; `kod:eylem` biçiminde kodlanır (ör. `employee:read`, `role:write`). Seed'de 48 yetki tanımlıdır.
- **Role:** İş alanını tanımlar (Admin, Müdür, Personel, …). Bir rolün birden çok yetkisi olabilir.
- **UserRole:** Kullanıcı-rol çoktan çoğa ilişkisi. Bir kullanıcı birden çok role sahip olabilir; yetki kümesi tüm rollerin birleşimidir.
- **isSystem:** Sistem rolleri silinemez ve değiştirilemez (Admin gibi).

## Model

```
User ──< UserRole >── Role ──< RolePermission >── Permission
```

## Yetki Kontrol Akışı

1. `JwtAuthGuard` JWT'yi doğrular ve `AuthenticatedUser` (userId, authId, roles, permissions) üretir.
2. `PermissionsGuard` route'a eklenen `@RequirePermissions(...)` kriterlerini kontrol eder.
3. Kriterlerden herhangi biri kümede yoksa `403 Forbidden`.

## Modül kodları (seed'deki yetki kataloğu)

| Modül | Örnek yetkiler |
|---|---|
| personel | `employee:read`, `employee:write`, `employee:delete` |
| izin | `leave:read/create/approve/reject` |
| mesai | `overtime:read/create/approve/reject` |
| maas | `payroll:read`, `payroll:write` |
| görev | `task:read/create/assign` |
| zimmet | `asset:read/write/return` |
| evrak | `document:read/create` |
| duyuru | `announcement:create/publish` |
| rapor | `report:view/create/export` |
| puantaj | `attendance:read/write` |
| qr | `qr:read/write/report` |
| organizasyon | `company:read/write`, `department:read/write`, `unit:read/write`, `location:read/write`, `title:read/write`, `position:read/write` |
| erişim | `role:read/write`, `user:read/write` |
| denetim | `audit:read` |

## UI Eşleşmesi

- `src/stores/auth.ts` → `hasPermission(code)` ile menü/buton görünürlüğü.
- `Roller Yetkiler` sayfası: rol seçilerek yetki kutucukları işaretlenir (`PATCH /api/roles/:id/permissions`).
- `Kullanıcılar` sayfası: kullanıcıya rol atama (`PATCH /api/users/:id/roles`).