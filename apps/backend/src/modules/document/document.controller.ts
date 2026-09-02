import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DocumentService } from './document.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentListQueryDto } from './dto/document.dto';

@ApiTags('evraklar')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @RequirePermissions('document:read')
  list(@Query() query: DocumentListQueryDto) {
    return this.documentService.list(query);
  }

  @Get(':id')
  @RequirePermissions('document:read')
  find(@Param('id') id: string) {
    return this.documentService.find(id);
  }

  @Post()
  @RequirePermissions('document:write')
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentService.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('document:write')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('document:write')
  remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }
}
