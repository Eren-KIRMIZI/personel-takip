import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, TaskListQueryDto } from './dto/task.dto';

@ApiTags('görevler')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermissions('task:read')
  async list(@Query() query: TaskListQueryDto) {
    return this.taskService.list(query);
  }

  @Get('stats')
  @RequirePermissions('task:read')
  async getStats() {
    return this.taskService.getStats();
  }

  @Get(':id')
  @RequirePermissions('task:read')
  find(@Param('id') id: string) {
    return this.taskService.find(id);
  }

  @Post()
  @RequirePermissions('task:write')
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('task:write')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.update(id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions('task:write')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.updateStatus(id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('task:write')
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
