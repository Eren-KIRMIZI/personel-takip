-- CreateEnum
CREATE TYPE "EmployeeRecordCategory" AS ENUM ('DISCIPLINARY', 'REWARD');

-- CreateEnum
CREATE TYPE "EmployeeRecordType" AS ENUM ('WARNING', 'REPRIMAND', 'SUSPENSION', 'DEDUCTION', 'TERMINATION', 'PRAISE', 'AWARD', 'CERTIFICATE');

-- CreateTable
CREATE TABLE "employee_records" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "category" "EmployeeRecordCategory" NOT NULL,
    "type" "EmployeeRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "issuedById" UUID,
    "createdById" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_records_employeeId_idx" ON "employee_records"("employeeId");

-- CreateIndex
CREATE INDEX "employee_records_category_idx" ON "employee_records"("category");

-- CreateIndex
CREATE INDEX "employee_records_date_idx" ON "employee_records"("date");

-- AddForeignKey
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
