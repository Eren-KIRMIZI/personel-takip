import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateOvertimeDto, OvertimeListQueryDto, RejectOvertimeDto } from './dto/overtime.dto';
import { OvertimeService } from './overtime.service';
import type { Request } from 'express';

@ApiTags('mesai')
@ApiBearerAuth()
@Controller('overtimes')
export class OvertimeController {
  constructor(private readonly overtime: OvertimeService) {}

  @Get()
  @RequirePermissions('overtime:read')
  list(@Query() query: OvertimeListQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.overtime.list(query);
  }

  @Get(':id')
  @RequirePermissions('overtime:read')
  find(@Param('id') id: string) {
    return this.overtime.find(id);
  }

  @Post()
  @RequirePermissions('overtime:create')
  create(
    @Body() dto: CreateOvertimeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.overtime.create(dto, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('overtime:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.overtime.approve(id, user.userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('overtime:reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOvertimeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.overtime.reject(id, dto.rejectionReason, user.userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('overtime:create')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.overtime.cancel(id, user.userId);
  }
}