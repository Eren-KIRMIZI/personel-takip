import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { UploadFileDto } from './dto/upload.dto';

const BUCKET = 'documents';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadService {
  private bucketReady: boolean | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  async upload(dto: UploadFileDto): Promise<{ url: string }> {
    const storage = this.supabase.adminClient.storage;

    const bucketReady = await this.ensureBucket();
    if (!bucketReady) {
      throw new BadRequestException('Depolama (bucket) hazırlanamadı.');
    }

    const mime = dto.contentType || 'application/octet-stream';
    const base64 = dto.base64.replace(/^data:[^;,]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) throw new BadRequestException('Dosya içeriği boş.');
    if (buffer.length > MAX_SIZE) throw new BadRequestException('Dosya boyutu 10 MB sınırını aşıyor.');

    const ext =
      MIME_EXT[mime.toLowerCase()] ??
      (dto.fileName?.split('.').pop()?.toLowerCase() || 'bin');
    const folder = (dto.folder ?? 'leave-docs').replace(/[^a-z0-9_-]/gi, '') || 'files';
    const path = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const { error } = await storage.from(BUCKET).upload(path, buffer, {
      contentType: mime,
      upsert: false,
      cacheControl: '3600',
    });
    if (error) {
      throw new BadRequestException(`Dosya yüklenemedi: ${error.message}`);
    }

    const { data } = storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  }

  private async ensureBucket(): Promise<boolean> {
    if (this.bucketReady !== null) return this.bucketReady;
    const storage = this.supabase.adminClient.storage;
    const { data: buckets } = await storage.listBuckets();
    if (buckets?.some((b) => b.name === BUCKET)) {
      this.bucketReady = true;
      return true;
    }
    const { error } = await storage.createBucket(BUCKET, { public: true });
    this.bucketReady = !error;
    return this.bucketReady;
  }
}