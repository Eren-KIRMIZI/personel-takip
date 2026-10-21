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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
};

const ALLOWED_EXTS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'doc', 'xlsx', 'xls', 'csv']);

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

    const mimeNormalized = (dto.contentType || '').toLowerCase().trim();
    const rawExt = (dto.fileName?.split('.').pop() || '').toLowerCase().trim();

    const extFromMime = MIME_EXT[mimeNormalized];
    const finalExt = extFromMime ?? (ALLOWED_EXTS.has(rawExt) ? rawExt : null);

    if (!finalExt || !ALLOWED_EXTS.has(finalExt)) {
      throw new BadRequestException(
        'Desteklenmeyen dosya türü. Yalnızca PDF, görsel (PNG, JPG, WEBP) ve ofis belgeleri yüklenebilir.',
      );
    }

    const base64 = dto.base64.replace(/^data:[^;,]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) throw new BadRequestException('Dosya içeriği boş.');
    if (buffer.length > MAX_SIZE) throw new BadRequestException('Dosya boyutu 10 MB sınırını aşıyor.');

    const folder = (dto.folder ?? 'leave-docs').replace(/[^a-z0-9_-]/gi, '') || 'files';
    const path = `${folder}/${Date.now()}-${randomUUID()}.${finalExt}`;

    const { error } = await storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeNormalized || 'application/octet-stream',
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