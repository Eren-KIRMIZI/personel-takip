import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  LeaveListQueryDto,
  RejectLeaveRequestDto,
  UpdateLeaveTypeDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';
import type { Request } from 'express';

@ApiTags('izin')
@ApiBearerAuth()
@Controller()
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  // --- İzin tipleri ---

  @Get('leave-types')
  @RequirePermissions('leave:read')
  listTypes() {
    return this.leave.listLeaveTypes();
  }

  @Post('leave-types')
  @RequirePermissions('leave:write')
  createType(@Body() dto: CreateLeaveTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.createLeaveType(dto, user.userId);
  }

  @Patch('leave-types/:id')
  @RequirePermissions('leave:write')
  updateType(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leave.updateLeaveType(id, dto, user.userId);
  }

  @Delete('leave-types/:id')
  @RequirePermissions('leave:write')
  removeType(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.removeLeaveType(id, user.userId);
  }

  // --- Talepler ---

  @Get('leave-requests')
  @RequirePermissions('leave:read')
  list(@Query() query: LeaveListQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.listRequests(query, user);
  }

  @Get('leave-requests/:id')
  @RequirePermissions('leave:read')
  find(@Param('id') id: string) {
    return this.leave.findRequest(id);
  }

  @Post('leave-requests')
  @RequirePermissions('leave:create')
  create(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.leave.createRequest(dto, user.userId);
  }

  @Patch('leave-requests/:id/approve')
  @RequirePermissions('leave:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.approve(id, user.userId);
  }

  @Patch('leave-requests/:id/reject')
  @RequirePermissions('leave:reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leave.reject(id, dto.rejectionReason, user.userId);
  }

  @Patch('leave-requests/:id/cancel')
  @RequirePermissions('leave:create')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leave.cancel(id, user.userId);
  }
}