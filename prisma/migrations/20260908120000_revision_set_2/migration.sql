-- CreateEnum
CREATE TYPE "LeaveDayPart" AS ENUM ('MORNING', 'AFTERNOON');

-- AlterEnum
ALTER TYPE "AssetStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "AssetStatus" ADD VALUE 'REJECTED';
ALTER TYPE "AssetStatus" ADD VALUE 'RETURN_PENDING';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ASSET_APPROVAL_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'ASSET_RETURN_REQUEST';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "educationDetail" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "halfDayType" "LeaveDayPart";

-- AlterTable
ALTER TABLE "overtime_entries" ADD COLUMN     "workArea" TEXT;

-- CreateTable
CREATE TABLE "card_credential_locations" (
    "id" UUID NOT NULL,
    "credentialId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_credential_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_credential_locations_locationId_idx" ON "card_credential_locations"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "card_credential_locations_credentialId_locationId_key" ON "card_credential_locations"("credentialId", "locationId");

-- AddForeignKey
ALTER TABLE "card_credential_locations" ADD CONSTRAINT "card_credential_locations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "card_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_credential_locations" ADD CONSTRAINT "card_credential_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "work_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Veri güncellemeleri (canlı veri, idempotent)
-- ============================================================================

-- "Hastalık Raporu" izin tipi adı "Rapor" yapıldı
UPDATE "leave_types" SET "name" = 'Rapor' WHERE "code" = 'sick' AND "name" = 'Hastalık Raporu';

-- Süt İzni eklendi (yarım gün kullanımı için defaultDays yok)
INSERT INTO "leave_types" ("id", "name", "code", "paid", "color", "defaultDays", "isActive", "createdAt")
VALUES (gen_random_uuid(), 'Süt İzni', 'maternity', true, '#f59e0b', NULL, true, now())
ON CONFLICT ("code") DO NOTHING;

-- Zimmet onay yetkisi
INSERT INTO "permissions" ("id", "code", "name", "description", "module", "createdAt")
VALUES (gen_random_uuid(), 'asset:approve', 'Zimmet onaylama', 'Zimmet atama onayı ve iade talebi oluşturma', 'zimmet', now())
ON CONFLICT ("code") DO NOTHING;

-- asset:approve tüm ilgili rollere
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."code" = 'asset:approve' AND r."code" IN ('admin', 'hr_specialist', 'unit_manager', 'employee')
ON CONFLICT DO NOTHING;

-- Birim yöneticisi zimmet atayabilsin ve iade onaylayabilsin
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."code" IN ('asset:write', 'asset:return') AND r."code" = 'unit_manager'
ON CONFLICT DO NOTHING;