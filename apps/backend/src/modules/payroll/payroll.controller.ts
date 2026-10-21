import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreatePayrollDto, PayrollListQueryDto, SetSalaryDto, UpdatePayrollDto } from './dto/payroll.dto';
import { PayrollService } from './payroll.service';
import type { Request } from 'express';

@ApiTags('maaş')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  @RequirePermissions('payroll:read')
  list(@Query() query: PayrollListQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payroll.list(query, user);
  }

  @Get('employees/:employeeId/salary')
  @RequirePermissions('payroll:read')
  getEmployeeSalary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payroll.getEmployeeSalary(employeeId, user);
  }

  @Post('employees/:employeeId/salary')
  @RequirePermissions('payroll:write')
  setSalary(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() dto: SetSalaryDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.payroll.setSalary(employeeId, dto, user.userId);
  }

  @Post('generate')
  @RequirePermissions('payroll:write')
  generate(@Body() dto: CreatePayrollDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.payroll.generate(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('payroll:write')
  update(@Param('id') id: string, @Body() dto: UpdatePayrollDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.payroll.update(id, dto, user.userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('payroll:approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payroll.approve(id, user.userId);
  }

  @Patch(':id/paid')
  @RequirePermissions('payroll:approve')
  markPaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payroll.markPaid(id, user.userId);
  }
}