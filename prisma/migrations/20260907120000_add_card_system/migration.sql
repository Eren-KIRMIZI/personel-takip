-- AlterEnum
ALTER TYPE "PunchSource" ADD VALUE 'CARD';

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "cardCredentialId" UUID,
ADD COLUMN     "cardReaderId" UUID;

-- CreateTable
CREATE TABLE "card_credentials" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "cardUid" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_readers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "serialNo" TEXT,
    "locationId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_readers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_credentials_cardUid_key" ON "card_credentials"("cardUid");

-- CreateIndex
CREATE INDEX "card_credentials_employeeId_idx" ON "card_credentials"("employeeId");

-- CreateIndex
CREATE INDEX "card_readers_locationId_idx" ON "card_readers"("locationId");

-- CreateIndex
CREATE INDEX "attendance_records_cardReaderId_idx" ON "attendance_records"("cardReaderId");

-- CreateIndex
CREATE INDEX "attendance_records_cardCredentialId_idx" ON "attendance_records"("cardCredentialId");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_cardReaderId_fkey" FOREIGN KEY ("cardReaderId") REFERENCES "card_readers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_cardCredentialId_fkey" FOREIGN KEY ("cardCredentialId") REFERENCES "card_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_credentials" ADD CONSTRAINT "card_credentials_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_readers" ADD CONSTRAINT "card_readers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "work_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;