import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementListQueryDto } from './dto/announcement.dto';

@ApiTags('duyurular')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  /** Yönetici listesi: tüm duyurular */
  @Get()
  @RequirePermissions('announcement:read')
  list(@Query() query: AnnouncementListQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementService.list(query, user);
  }

  /** Personel akışı: sadece kendisine yönelik yayında duyurular */
  @Get('my')
  @RequirePermissions('announcement:read')
  listMy(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!user.employeeId) return { items: [], total: 0, page: 1, pageSize: 20 };
    return this.announcementService.listForEmployee(
      user.employeeId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @Get(':id')
  @RequirePermissions('announcement:read')
  find(@Param('id') id: string) {
    return this.announcementService.find(id);
  }

  @Post()
  @RequirePermissions('announcement:write')
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementService.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('announcement:write')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementService.update(id, dto, user.userId);
  }

  @Post(':id/read')
  @RequirePermissions('announcement:read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) return { ok: false };
    return this.announcementService.markRead(id, user.employeeId);
  }

  @Delete(':id')
  @RequirePermissions('announcement:write')
  remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }
}
