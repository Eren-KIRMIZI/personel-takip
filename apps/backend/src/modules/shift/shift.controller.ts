import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AssignShiftDto, BulkAssignShiftDto, CreateShiftDto, ShiftAssignmentListDto } from './dto/shift.dto';
import { ShiftService } from './shift.service';
import type { Request } from 'express';

@ApiTags('vardiya')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shift: ShiftService) {}

  @Get()
  @RequirePermissions('shift:read')
  listShifts(@Query('workLocationId') workLocationId?: string, @Query('includeInactive') includeInactive?: string) {
    return this.shift.listShifts({ workLocationId, includeInactive: includeInactive === 'true' });
  }

  @Post()
  @RequirePermissions('shift:write')
  createShift(@Body() dto: CreateShiftDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.shift.createShift(dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('shift:write')
  removeShift(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.shift.removeShift(id, user.userId);
  }

  @Get('assignments')
  @RequirePermissions('shift:read')
  listAssignments(@Query() query: ShiftAssignmentListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shift.listAssignments(query, user);
  }

  @Post('assignments')
  @RequirePermissions('shift:write')
  assign(@Body() dto: AssignShiftDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.shift.assign(dto, user.userId);
  }

  @Post('assignments/bulk')
  @RequirePermissions('shift:write')
  bulkAssign(@Body() dto: BulkAssignShiftDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.shift.bulkAssign(dto, user.userId);
  }

  @Delete('assignments/:id')
  @RequirePermissions('shift:write')
  removeAssignment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.shift.removeAssignment(id, user.userId);
  }
}