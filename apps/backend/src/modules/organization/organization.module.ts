import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrgControllers } from './organization.controller';

@Module({
  controllers: OrgControllers,
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}