-- CreateIndex
CREATE INDEX "advances_approvedById_idx" ON "advances"("approvedById");

-- CreateIndex
CREATE INDEX "announcement_employees_employeeId_idx" ON "announcement_employees"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_records_locationId_idx" ON "attendance_records"("locationId");

-- CreateIndex
CREATE INDEX "bonuses_approvedById_idx" ON "bonuses"("approvedById");

-- CreateIndex
CREATE INDEX "employee_records_issuedById_idx" ON "employee_records"("issuedById");

-- CreateIndex
CREATE INDEX "employees_titleId_idx" ON "employees"("titleId");

-- CreateIndex
CREATE INDEX "employees_positionId_idx" ON "employees"("positionId");

-- CreateIndex
CREATE INDEX "employees_managerId_idx" ON "employees"("managerId");

-- CreateIndex
CREATE INDEX "leave_requests_leaveTypeId_idx" ON "leave_requests"("leaveTypeId");

-- CreateIndex
CREATE INDEX "notifications_announcementId_idx" ON "notifications"("announcementId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");
