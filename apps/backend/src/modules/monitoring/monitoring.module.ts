import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
