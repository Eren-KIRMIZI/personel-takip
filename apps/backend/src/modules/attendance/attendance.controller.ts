import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  AttendanceListQueryDto,
  CreateAttendanceDto,
  CreateQrCodeDto,
  ScanAttendanceDto,
} from './dto/attendance.dto';
import { AttendanceService } from './attendance.service';

@ApiTags('giris-cikis')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @RequirePermissions('attendance:read')
  list(@Query() query: AttendanceListQueryDto) {
    return this.attendance.list(query);
  }

  @Post()
  @RequirePermissions('attendance:write')
  punch(@Body() dto: CreateAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.punch(dto, user.userId);
  }

  @Get('qr-codes')
  @RequirePermissions('qr:read')
  qrCodes(@Query() query: { page?: number; pageSize?: number; includeInactive?: string }) {
    return this.attendance.qrCodes({
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      includeInactive: query.includeInactive === 'true',
    });
  }

  @Post('qr-codes')
  @RequirePermissions('qr:write')
  createQrCode(@Body() dto: CreateQrCodeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.createQrCode(dto, user.userId);
  }

  @Get('qr-codes/:id/qr')
  @RequirePermissions('qr:read')
  qrImage(@Param('id') id: string) {
    return this.attendance.qrImage(id);
  }

  @Post('scan')
  @RequirePermissions('attendance:write')
  scan(@Body() dto: ScanAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.scan(dto, { userId: user.userId, employeeId: user.employeeId });
  }
}