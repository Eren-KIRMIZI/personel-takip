import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

/**
 * Upstash Redis üzerinden çalışan cache servisi.
 *
 * - HTTP tabanlı @upstash/redis kullanır → Vercel serverless ile tam uyumlu.
 * - Tüm methodlar try/catch içinde → Redis kapansa bile uygulama çalışır.
 * - Hassas veriler (maaş, payroll) bu servise KONULMAMALI.
 */
@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('UPSTASH_REDIS_URL');
    const token = this.config.get<string>('UPSTASH_REDIS_TOKEN');

    if (!url || !token) {
      this.logger.warn(
        'UPSTASH_REDIS_URL veya UPSTASH_REDIS_TOKEN tanımlı değil → cache devre dışı.',
      );
      return;
    }

    try {
      this.redis = new Redis({ url, token });
      this.enabled = true;
      this.logger.log('Upstash Redis bağlantısı hazır.');
    } catch (err) {
      this.logger.error('Redis başlatılamadı → cache devre dışı.', err);
    }
  }

  /**
   * Cache'den değer oku.
   * Miss veya hata durumunda `null` döner.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;
    try {
      const data = await this.redis.get<T>(key);
      return data ?? null;
    } catch (err) {
      this.logger.warn(`Cache GET hatası [${key}]: ${String(err)}`);
      return null;
    }
  }

  /**
   * Cache'e değer yaz.
   * @param ttlSeconds Saniye cinsinden TTL. Sıfır veya negatif → yazma.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.redis || ttlSeconds <= 0) return;
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(`Cache SET hatası [${key}]: ${String(err)}`);
    }
  }

  /**
   * Tek veya birden fazla key'i sil.
   */
  async del(...keys: string[]): Promise<void> {
    if (!this.enabled || !this.redis || keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache DEL hatası [${keys.join(', ')}]: ${String(err)}`);
    }
  }

  /**
   * Verilen prefix ile başlayan tüm key'leri sil.
   * SCAN kullanır — büyük key alanlarında dikkatli ol.
   */
  async delByPrefix(prefix: string): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, {
          match: `${prefix}*`,
          count: 100,
        });
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== 0);
    } catch (err) {
      this.logger.warn(`Cache DEL_PREFIX hatası [${prefix}]: ${String(err)}`);
    }
  }

  /** Cache etkin mi? */
  isEnabled(): boolean {
    return this.enabled;
  }
}
