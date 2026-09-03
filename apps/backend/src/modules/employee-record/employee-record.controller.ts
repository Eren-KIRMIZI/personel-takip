import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateEmployeeRecordDto, EmployeeRecordListQueryDto, UpdateEmployeeRecordDto } from './dto/employee-record.dto';
import { EmployeeRecordService } from './employee-record.service';

@ApiTags('disiplin-ve-tesvik')
@ApiBearerAuth()
@Controller('employee-records')
export class EmployeeRecordController {
  constructor(private readonly service: EmployeeRecordService) {}

  @Get()
  @RequirePermissions('employee-record:read')
  list(@Query() query: EmployeeRecordListQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions('employee-record:write')
  create(@Body() dto: CreateEmployeeRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('employee-record:write')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('employee-record:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.userId);
  }
}