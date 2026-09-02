# Personel Takip Sistemi

Personel ve insan kaynakları yönetim modülü. Monorepo: NestJS + Prisma + Supabase backend, React 19 + Vite + Tailwind frontend.

## Ortam

- Node.js ≥ 22 (24.12.0 ile test edildi), npm ≥ 10
- Supabase projesi (bölge: ap-southeast-1) — bağlantı bilgileri kök `.env`'de

## Kurulum

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init   # DIRECT_URL (port 5432) üzerinden
```

## Ortam Değişkenleri

`.env` (kök) dosyasını düzenle:

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Transaction pooler (6543, `pgbouncer=true`) |
| `DIRECT_URL` | Session pooler (5432) — migration/seed |
| `SUPABASE_URL` | Proje URL'si |
| `SUPABASE_ANON_KEY` | Anon/publishable anahtar |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (yalnızca sunucu; asla `VITE_`) |
| `SUPABASE_JWT_SECRET` | HS256 token doğrulama gizli anahtarı |

`apps/frontend/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.

## Çalıştırma

```bash
npm run dev            # tüm workspace'ler (backend :3000, frontend :5173)
npm run seed --workspace @personel-takip/backend   # ADMIN_EMAIL/ADMIN_PASSWORD ile
```

- REST API: http://localhost:3000/api — Swagger: http://localhost:3000/api/docs
- Frontend: http://localhost:5173

## Script'ler

```bash
npm run build --workspace @personel-takip/backend
npm run build --workspace @personel-takip/frontend
npm run typecheck --workspace @personel-takip/backend
```

## Dizin Yapısı

Bkz. `docs/ARCHITECTURE.md` ve `docs/RBAC.md`.

## Güvenlik

Sırları yalnızca `.env`'de tutun; `.env` dosyaları gitignore'dadır. Service role anahtarını asla tarayıcıya göndermeyin.