import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import {
  IncidentListQueryDto,
  AcknowledgeIncidentDto,
  ResolveIncidentDto,
  ReportClientErrorDto,
  HealthCheckQueryDto,
} from './dto/monitoring.dto';

@ApiTags('monitoring')
@ApiBearerAuth()
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  // ── Dashboard özeti (sistem:read) ─────────────────────────────
  @Get('summary')
  @RequirePermissions('monitoring:read')
  summary() {
    return this.monitoring.getDashboardSummary();
  }

  // ── Dahili sağlık kontrolü tetikle ────────────────────────────
  @Post('health/check')
  @RequirePermissions('monitoring:read')
  @HttpCode(HttpStatus.OK)
  runHealthCheck() {
    return this.monitoring.runInternalHealthCheck();
  }

  // ── Son sağlık snapshot'ı ────────────────────────────────────
  @Get('health')
  @RequirePermissions('monitoring:read')
  healthSnapshot() {
    return this.monitoring.getLastHealthSnapshot();
  }

  // ── Sağlık geçmişi ────────────────────────────────────────────
  @Get('health/history')
  @RequirePermissions('monitoring:read')
  healthHistory(@Query() query: HealthCheckQueryDto) {
    return this.monitoring.getHealthHistory(
      query.service,
      query.limit ? Number(query.limit) : 50,
    );
  }

  // ── Olay listesi ──────────────────────────────────────────────
  @Get('incidents')
  @RequirePermissions('monitoring:read')
  listIncidents(@Query() query: IncidentListQueryDto) {
    return this.monitoring.listIncidents({
      page: query.page,
      pageSize: query.pageSize,
      severity: query.severity,
      status: query.status,
      category: query.category,
      service: query.service,
      from: query.from,
      to: query.to,
    });
  }

  // ── Olay detayı ───────────────────────────────────────────────
  @Get('incidents/:id')
  @RequirePermissions('monitoring:read')
  getIncident(@Param('id') id: string) {
    return this.monitoring.getIncidentDetail(id);
  }

  // ── Olay incelendi işaretle ───────────────────────────────────
  @Patch('incidents/:id/acknowledge')
  @RequirePermissions('monitoring:write')
  @HttpCode(HttpStatus.OK)
  acknowledge(@Param('id') id: string, @Body() _dto: AcknowledgeIncidentDto) {
    return this.monitoring.acknowledgeIncident(id);
  }

  // ── Olay çözüldü işaretle ─────────────────────────────────────
  @Patch('incidents/:id/resolve')
  @RequirePermissions('monitoring:write')
  @HttpCode(HttpStatus.OK)
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.monitoring.resolveIncident(id, dto.resolvedBy ?? `manual:${user.username}`);
  }

  // ── Frontend hata raporu (tüm giriş yapmış kullanıcılar) ─────
  @Post('client-error')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reportClientError(
    @Body() dto: ReportClientErrorDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    // stack trace saklanmaz — sadece maskelenmiş message + route
    await this.monitoring.reportClientError({
      message: dto.message,
      route: dto.route,
      module: dto.module,
      correlationId: dto.correlationId,
      appVersion: dto.appVersion,
    });
  }
}
