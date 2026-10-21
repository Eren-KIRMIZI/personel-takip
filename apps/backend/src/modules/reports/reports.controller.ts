import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { NonCardPunchQueryDto, PeriodicReportQueryDto, ReportQueryDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('raporlar')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequirePermissions('employee:read')
  dashboardSummary() {
    return this.reports.dashboardSummary();
  }

  @Get('attendance')
  @RequirePermissions('attendance:read')
  attendance(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.attendanceSummary(query, user);
  }

  @Get('attendance/excel')
  @RequirePermissions('attendance:read')
  attendanceExcel(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.attendanceExcel(query, user);
  }

  @Get('attendance-log')
  @RequirePermissions('attendance:read')
  attendanceLog(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.attendanceLog(query, user);
  }

  @Get('attendance-log/excel')
  @RequirePermissions('attendance:read')
  attendanceLogExcel(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.attendanceLogExcel(query, user);
  }

  @Get('overtimes')
  @RequirePermissions('overtime:read')
  overtimes(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.overtimeSummary(query, user);
  }

  @Get('overtimes/excel')
  @RequirePermissions('overtime:read')
  overtimeExcel(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.overtimeExcel(query, user);
  }

  @Get('leaves')
  @RequirePermissions('leave:read')
  leaves(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.leaveSummary(query, user);
  }

  @Get('leaves/excel')
  @RequirePermissions('leave:read')
  leaveExcel(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.leaveExcel(query, user);
  }

  @Get('entries')
  @RequirePermissions('attendance:read')
  entries(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.attendanceEntries(query, user);
  }

  @Get('late')
  @RequirePermissions('attendance:read')
  late(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.lateArrivals(query, user);
  }

  @Get('early')
  @RequirePermissions('attendance:read')
  early(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.earlyDepartures(query, user);
  }

  @Get('absences')
  @RequirePermissions('attendance:read')
  absences(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.absences(query, user);
  }

  @Get('non-card')
  @RequirePermissions('attendance:read')
  nonCard(@Query() query: NonCardPunchQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.nonCardPunches(query, user);
  }

  @Get('present-now')
  @RequirePermissions('attendance:read')
  presentNow() {
    return this.reports.presentNow();
  }

  @Get('manual')
  @RequirePermissions('attendance:read')
  manual(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.manualPunches(query, user);
  }

  @Get('new-hires')
  @RequirePermissions('employee:read')
  newHires(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.newHires(query, user);
  }

  @Get('terminations')
  @RequirePermissions('employee:read')
  terminations(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.terminations(query, user);
  }

  @Get('weekend-work')
  @RequirePermissions('attendance:read')
  weekendWork(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.weekendWork(query, user);
  }

  @Get('monthly-attendance')
  @RequirePermissions('attendance:read')
  monthlyAttendance(@Query() query: PeriodicReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.monthlyAttendance(query, user);
  }

  @Get('payrun')
  @RequirePermissions('payroll:read')
  payrun(@Query() query: PeriodicReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.payrun(query, user);
  }
}