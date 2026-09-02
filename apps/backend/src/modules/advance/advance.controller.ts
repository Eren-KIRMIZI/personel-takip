import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AdvanceListQueryDto, CreateAdvanceDto, RejectAdvanceDto } from './dto/advance.dto';
import { AdvanceService } from './advance.service';

@ApiTags('avans')
@ApiBearerAuth()
@Controller('advances')
export class AdvanceController {
  constructor(private readonly advance: AdvanceService) {}

  @Get()
  @RequirePermissions('advance:read')
  list(@Query() query: AdvanceListQueryDto) {
    return this.advance.list(query);
  }

  @Post()
  @RequirePermissions('advance:write')
  create(@Body() dto: CreateAdvanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.advance.create(dto, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('advance:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.advance.approve(id, user.userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('advance:approve')
  reject(@Param('id') id: string, @Body() dto: RejectAdvanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.advance.reject(id, dto, user.userId);
  }

  @Patch(':id/paid')
  @RequirePermissions('advance:approve')
  markPaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.advance.markPaid(id, user.userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('advance:write')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.advance.cancel(id, user.userId);
  }
}