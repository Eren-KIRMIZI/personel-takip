import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Type,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  CreateCompanyDto,
  CreateDepartmentDto,
  CreatePositionDto,
  CreateTitleDto,
  CreateUnitDto,
  CreateWorkLocationDto,
  ListQueryDto,
  UpdateCompanyDto,
  UpdateDepartmentDto,
  UpdatePositionDto,
  UpdateTitleDto,
  UpdateUnitDto,
  UpdateWorkLocationDto,
} from './dto/organization.dto';
import { OrgModel, OrganizationService } from './organization.service';
import type { Request } from 'express';

interface OrgControllerConfig {
  route: string;
  model: OrgModel;
  readPerm: string;
  writePerm: string;
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
}

function createOrgController(config: OrgControllerConfig): Type<unknown> {
  const { route, model, readPerm, writePerm } = config;

  @ApiTags('organizasyon')
  @ApiBearerAuth()
  @Controller(route)
  class OrgController {
    constructor(private readonly service: OrganizationService) {}

    @Get()
    @RequirePermissions(readPerm)
    list(@Query() query: ListQueryDto, @CurrentUser() user: AuthenticatedUser) {
      return this.service.list(model, query, { userId: user.userId });
    }

    @Get(':id')
    @RequirePermissions(readPerm)
    find(@Param('id') id: string) {
      return this.service.find(model, id);
    }

    @Post()
    @RequirePermissions(writePerm)
    create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
      return this.service.create(
        model,
        body as Record<string, unknown>,
        { userId: user.userId, ip: req.ip, userAgent: req.headers['user-agent'] },
      );
    }

    @Patch(':id')
    @RequirePermissions(writePerm)
    update(
      @Param('id') id: string,
      @Body() body: unknown,
      @CurrentUser() user: AuthenticatedUser,
      @Req() req: Request,
    ) {
      return this.service.update(
        model,
        id,
        body as Record<string, unknown>,
        { userId: user.userId, ip: req.ip, userAgent: req.headers['user-agent'] },
      );
    }

    @Delete(':id')
    @RequirePermissions(writePerm)
    remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
      return this.service.remove(model, id, {
        userId: user.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  }

  return OrgController;
}

export const OrgControllers: Type<unknown>[] = [
  createOrgController({
    route: 'companies',
    model: 'company',
    readPerm: 'company:read',
    writePerm: 'company:write',
    createDto: CreateCompanyDto,
    updateDto: UpdateCompanyDto,
  }),
  createOrgController({
    route: 'departments',
    model: 'department',
    readPerm: 'department:read',
    writePerm: 'department:write',
    createDto: CreateDepartmentDto,
    updateDto: UpdateDepartmentDto,
  }),
  createOrgController({
    route: 'units',
    model: 'unit',
    readPerm: 'unit:read',
    writePerm: 'unit:write',
    createDto: CreateUnitDto,
    updateDto: UpdateUnitDto,
  }),
  createOrgController({
    route: 'work-locations',
    model: 'workLocation',
    readPerm: 'location:read',
    writePerm: 'location:write',
    createDto: CreateWorkLocationDto,
    updateDto: UpdateWorkLocationDto,
  }),
  createOrgController({
    route: 'titles',
    model: 'title',
    readPerm: 'title:read',
    writePerm: 'title:write',
    createDto: CreateTitleDto,
    updateDto: UpdateTitleDto,
  }),
  createOrgController({
    route: 'positions',
    model: 'position',
    readPerm: 'position:read',
    writePerm: 'position:write',
    createDto: CreatePositionDto,
    updateDto: UpdatePositionDto,
  }),
];