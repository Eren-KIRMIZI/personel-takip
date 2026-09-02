# Personel Takip — Mimari

## Genel Bakış

npm workspaces tabanlı monorepo:

```
personel-takip/
├─ apps/
│  ├─ backend/     # NestJS 12 REST API (global prefix: /api)
│  └─ frontend/    # React 19 + Vite 8 + Tailwind 4 + shadcn/ui
├─ packages/shared # Ortak TypeScript tipleri
├─ prisma/         # Şema + migration'lar (Supabase PostgreSQL)
└─ .env            # Kök ortam değişkenleri (gitignored)
```

## Veritabanı

- **Prisma 6** ile Supabase PostgreSQL'e bağlanılır.
- `DATABASE_URL`: transaction pooler (Supavisor, port 6543, `pgbouncer=true`) — uygulama.
- `DIRECT_URL`: session/direct bağlantı (port 5432) — migration & seed.
- Bölge `ap-southeast-1` (pooler host: `aws-0-ap-southeast-1.pooler.supabase.com`).
- Migration: `npx prisma migrate dev` (kök dizinde, `.env`'den okur).

## Kimlik Doğrulama (Auth)

- Frontend `@supabase/supabase-js` ile giriş yapar (`src/lib/supabase.ts`).
- JWT'yi backend'e `Authorization: Bearer <token>` ile taşır (`src/lib/api.ts`).
- Backend token'ı `jose` ile doğrular (`src/auth/auth.service.ts`):
  - algoritma `HS256`, issuer `<SUPABASE_URL>/auth/v1`, audience `authenticated`
  - secret: `SUPABASE_JWT_SECRET`
- Kullanıcı `users.auth_id` üzerinden eşleşir; kayıt yoksa lazy-provisioning ile otomatik oluşturulur.
- `JwtAuthGuard` globaldir; `@Public()` ile devre dışı bırakılır.

## Yetkilendirme (RBAC)

- Guard zinciri: `JwtAuthGuard` → `PermissionsGuard`.
- `@RequirePermissions('employee:read')` dekore edilmiş endpoint'ler, kullanıcının yetki kümesinde kodu bulamazsa 403 döner.
- Yetki kümeleri her istekte `users -> user_roles -> roles -> role_permissions -> permissions` zincirinden hesaplanır (performans için ileride cache eklenebilir).

## Modüller

| Modül | Rota | Sorumluluk |
|---|---|---|
| `auth` | `/api/auth/health`, `/api/auth/me` | Healthcheck + oturum sahibi bilgisi |
| `organization` | `/api/companies`, `/departments`, `/units`, `/work-locations`, `/titles`, `/positions` | Fabrika tabanlı 6 CRUD |
| `employees` | `/api/employees...` | Personel CRUD, görev geçmişi, durum değişikliği, hesap oluşturma |
| `access` | `/api/permissions`, `/roles`, `/users` | Rol-yetki ve kullanıcı yönetimi |
| `audit` | `/api/audit-logs` | Denetim kayıtları |
| `supabase` | — | Service role admin istemcisi (kullanıcı üretimi) |

## Audit

Her kritik değişiklik `audit_logs` tablosuna yazılır: aktör, eylem, varlık, önceki/sonraki durum, IP ve user-agent.

## Deployment (Vercel)

- Backend `api/index.ts` ile serverless adım olarak (`/api/*`, framework: hono benzeri adapter — `@vercel/node`) çalışır; `main.ts`'teki `createApp()` paylaşımlıdır, `Vercel` ortamında `listen` çağrılmaz.
- `vercel.json` yapılandırması repo kökündedir.
- Frontend statik olarak `dist/` üzerinden sunulur.
- Zorunlu ENV (Vercel'de de): `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.

## Güvenlik Notları

- Sırlar yalnızca `.env` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` hiçbir zaman `VITE_` önekli değişkene konmaz.
- Sunucu tarafında admin/anon anahtarlarınızı kullanmayın; doğrulama yalnızca JWT secret ile yapılır.