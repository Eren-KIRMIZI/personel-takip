-- CreateIndex
CREATE INDEX "overtime_entries_approvedById_idx" ON "overtime_entries"("approvedById");

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
