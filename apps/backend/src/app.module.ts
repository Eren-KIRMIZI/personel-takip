import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AccessModule } from './modules/access/access.module';
import { LeaveModule } from './modules/leave/leave.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ShiftModule } from './modules/shift/shift.module';
import { AuditHttpModule } from './modules/audit/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuditModule,
    SupabaseModule,
    AuthModule,
    OrganizationModule,
    EmployeesModule,
    AccessModule,
    LeaveModule,
    OvertimeModule,
    AttendanceModule,
    ReportsModule,
    ShiftModule,
    AuditHttpModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}