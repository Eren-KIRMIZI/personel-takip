import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { BonusService } from './bonus.service';
import { CreateBonusDto, UpdateBonusDto, UpdateBonusStatusDto, BonusListQueryDto } from './dto/bonus.dto';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Controller('bonuses')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Get()
  @RequirePermissions('bonus:read')
  async list(@Query() query: BonusListQueryDto) {
    return this.bonusService.list(query);
  }

  @Get('stats')
  @RequirePermissions('bonus:read')
  async getStats() {
    return this.bonusService.getStats();
  }

  @Get(':id')
  @RequirePermissions('bonus:read')
  async find(@Param('id') id: string) {
    return this.bonusService.find(id);
  }

  @Post()
  @RequirePermissions('bonus:write')
  async create(@Body() dto: CreateBonusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bonusService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('bonus:write')
  async update(@Param('id') id: string, @Body() dto: UpdateBonusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bonusService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('bonus:approve')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateBonusStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bonusService.updateStatus(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('bonus:write')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bonusService.remove(id, user.id);
  }
}
