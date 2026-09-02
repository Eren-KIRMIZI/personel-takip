import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportQueryDto } from './dto/report.dto';
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
  attendance(@Query() query: ReportQueryDto) {
    return this.reports.attendanceSummary(query);
  }

  @Get('attendance/excel')
  @RequirePermissions('attendance:read')
  attendanceExcel(@Query() query: ReportQueryDto) {
    return this.reports.attendanceExcel(query);
  }

  @Get('overtimes')
  @RequirePermissions('overtime:read')
  overtimes(@Query() query: ReportQueryDto) {
    return this.reports.overtimeSummary(query);
  }

  @Get('overtimes/excel')
  @RequirePermissions('overtime:read')
  overtimeExcel(@Query() query: ReportQueryDto) {
    return this.reports.overtimeExcel(query);
  }

  @Get('leaves')
  @RequirePermissions('leave:read')
  leaves(@Query() query: ReportQueryDto) {
    return this.reports.leaveSummary(query);
  }

  @Get('leaves/excel')
  @RequirePermissions('leave:read')
  leaveExcel(@Query() query: ReportQueryDto) {
    return this.reports.leaveExcel(query);
  }
}