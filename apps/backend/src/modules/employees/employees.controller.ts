import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateEmployeeDto, EmployeeListQueryDto, UpdateEmployeeDto } from './dto/employees.dto';
import { EmployeesService } from './employees.service';
import type { Request } from 'express';

@ApiTags('personel')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions('employee:read')
  list(@Query() query: EmployeeListQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.list(query, user);
  }

  @Get(':id/history')
  @RequirePermissions('employee:read')
  history(@Param('id') id: string) {
    return this.employees.history(id);
  }

  @Get(':id')
  @RequirePermissions('employee:read')
  find(@Param('id') id: string) {
    return this.employees.find(id);
  }

  @Post()
  @RequirePermissions('employee:write')
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.employees.create(dto, {
      userId: user.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id')
  @RequirePermissions('employee:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.employees.update(id, dto, {
      userId: user.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id/status')
  @RequirePermissions('employee:write')
  setStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'PASSIVE' | 'SUSPENDED',
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.employees.setStatus(id, status, {
      userId: user.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete(':id')
  @RequirePermissions('employee:write')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.employees.delete(id, {
      userId: user.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}