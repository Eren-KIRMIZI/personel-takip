import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  async list(@Query() query: any) {
    return this.auditService.list(query);
  }
}
