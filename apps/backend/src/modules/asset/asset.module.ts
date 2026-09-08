import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

@Module({
  imports: [NotificationModule],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}