-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ASSIGNED', 'RETURNED', 'LOST', 'DAMAGED', 'SERVICING');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "serialNo" TEXT,
    "category" TEXT,
    "description" TEXT,
    "condition" TEXT,
    "assignedDate" TIMESTAMP(3),
    "returnedDate" TIMESTAMP(3),
    "status" "AssetStatus" NOT NULL DEFAULT 'ASSIGNED',
    "note" TEXT,
    "issuedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_employeeId_idx" ON "assets"("employeeId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- AddForeignKey
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
