import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CardService } from './card.service';
import {
  CreateCardCredentialDto,
  CreateCardReaderDto,
  ScanCardDto,
  UpdateCardCredentialDto,
  UpdateCardReaderDto,
} from './dto/card.dto';

@ApiTags('kart-sistemi')
@ApiBearerAuth()
@Controller('card')
export class CardController {
  constructor(private readonly card: CardService) {}

  // Kart okutma — cihaz ve simülatör buraya bağlanır
  @Post('scan')
  @RequirePermissions('attendance:write')
  scan(@Body() dto: ScanCardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.card.scan(dto, { userId: user.userId, employeeId: user.employeeId });
  }

  @Get('credentials')
  @RequirePermissions('attendance:read')
  listCredentials(@Query() query: { page?: string; pageSize?: string; employeeId?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.card.listCredentials(
      {
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        employeeId: query.employeeId,
      },
      user,
    );
  }

  @Post('credentials')
  @RequirePermissions('attendance:write')
  createCredential(@Body() dto: CreateCardCredentialDto, @CurrentUser() user: AuthenticatedUser) {
    return this.card.createCredential(dto, user.userId);
  }

  @Patch('credentials/:id')
  @RequirePermissions('attendance:write')
  updateCredential(@Param('id') id: string, @Body() dto: UpdateCardCredentialDto, @CurrentUser() user: AuthenticatedUser) {
    return this.card.updateCredential(id, dto, user.userId);
  }

  @Get('readers')
  @RequirePermissions('attendance:read')
  listReaders(@Query() query: { page?: string; pageSize?: string }) {
    return this.card.listReaders({
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Post('readers')
  @RequirePermissions('attendance:write')
  createReader(@Body() dto: CreateCardReaderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.card.createReader(dto, user.userId);
  }

  @Patch('readers/:id')
  @RequirePermissions('attendance:write')
  updateReader(@Param('id') id: string, @Body() dto: UpdateCardReaderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.card.updateReader(id, dto, user.userId);
  }
}