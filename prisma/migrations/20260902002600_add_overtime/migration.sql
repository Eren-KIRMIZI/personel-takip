-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "overtime_entries" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" "OvertimeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_entries_employeeId_idx" ON "overtime_entries"("employeeId");

-- CreateIndex
CREATE INDEX "overtime_entries_date_idx" ON "overtime_entries"("date");

-- CreateIndex
CREATE INDEX "overtime_entries_status_idx" ON "overtime_entries"("status");

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
