import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AssetListQueryDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { AssetService } from './asset.service';

@ApiTags('zimmet')
@ApiBearerAuth()
@Controller('assets')
export class AssetController {
  constructor(private readonly asset: AssetService) {}

  @Get()
  @RequirePermissions('asset:read')
  list(@Query() query: AssetListQueryDto) {
    return this.asset.list(query);
  }

  @Post()
  @RequirePermissions('asset:write')
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.asset.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('asset:write')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.asset.update(id, dto, user.userId);
  }

  @Patch(':id/return')
  @RequirePermissions('asset:return')
  returnItem(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asset.returnItem(id, user.userId);
  }

  @Patch(':id/status/:status')
  @RequirePermissions('asset:write')
  updateStatus(@Param('id') id: string, @Param('status') status: AssetStatus, @CurrentUser() user: AuthenticatedUser) {
    return this.asset.updateStatus(id, status, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('asset:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asset.remove(id, user.userId);
  }
}