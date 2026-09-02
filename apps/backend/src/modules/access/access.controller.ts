import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessService } from './access.service';
import {
  CreateRoleDto,
  SetRolePermissionsDto,
  SetUserRolesDto,
  SetUserStatusDto,
  UpdateRoleDto,
} from './dto/access.dto';

@ApiTags('erişim')
@ApiBearerAuth()
@Controller()
export class AccessController {
  constructor(private readonly access: AccessService) {}

  // ---- Yetkiler ----
  @Get('permissions')
  @RequirePermissions('role:read')
  listPermissions() {
    return this.access.listPermissions();
  }

  // ---- Roller ----
  @Get('roles')
  @RequirePermissions('role:read')
  listRoles(@Query('search') search?: string) {
    return this.access.listRoles(search);
  }

  @Post('roles')
  @RequirePermissions('role:write')
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.access.createRole(dto, user.userId);
  }

  @Patch('roles/:id')
  @RequirePermissions('role:write')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.access.updateRole(id, dto, user.userId);
  }

  @Patch('roles/:id/permissions')
  @RequirePermissions('role:write')
  setRolePermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.access.setRolePermissions(id, dto, user.userId);
  }

  @Delete('roles/:id')
  @RequirePermissions('role:write')
  removeRole(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.access.removeRole(id, user.userId);
  }

  // ---- Kullanıcılar ----
  @Get('users')
  @RequirePermissions('user:read')
  listUsers(@Query('search') search?: string) {
    return this.access.listUsers(search);
  }

  @Patch('users/:id/roles')
  @RequirePermissions('user:write')
  setUserRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.access.setUserRoles(id, dto, user.userId);
  }

  @Patch('users/:id/status')
  @RequirePermissions('user:write')
  setUserStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.access.setUserStatus(id, dto, user.userId);
  }
}