import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global cache modülü — `@Global()` sayesinde her modülde
 * import etmeden `CacheService` inject edilebilir.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
