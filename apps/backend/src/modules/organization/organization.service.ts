import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ListQueryDto } from './dto/organization.dto';

// Basit in-memory cache — dış bağımlılık gerektirmez
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

export type OrgModel =
  | 'company'
  | 'department'
  | 'unit'
  | 'workLocation'
  | 'title'
  | 'position';

const ROUTE_TO_MODEL: Record<string, OrgModel> = {
  companies: 'company',
  departments: 'department',
  units: 'unit',
  'work-locations': 'workLocation',
  titles: 'title',
  positions: 'position',
};

@Injectable()
export class OrganizationService {
  // Cache: key → {data, expiresAt}
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Cache'den oku; süresi dolmuşsa undefined döner */
  private cacheGet<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /** Cache'e yaz */
  private cacheSet(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  /** Belirtilen model prefix'ine sahip tüm cache kayıtlarını temizle */
  private cacheInvalidate(model: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${model}:`)) this.cache.delete(key);
    }
  }

  delegate(model: OrgModel): any {
    const delegates: Record<OrgModel, any> = {
      company: this.prisma.company,
      department: this.prisma.department,
      unit: this.prisma.unit,
      workLocation: this.prisma.workLocation,
      title: this.prisma.title,
      position: this.prisma.position,
    };
    return delegates[model];
  }

  modelLabel(model: OrgModel): string {
    return this.prisma[model] ? model : model;
  }

  async list(model: OrgModel, query: ListQueryDto, actor: { userId: string }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        ...(model === 'company'
          ? [{ taxNo: { contains: query.search, mode: 'insensitive' } }]
          : []),
      ];
    }

    // Cache key: model + tüm query parametreleri
    const cacheKey = `${model}:${JSON.stringify({ ...query, page, pageSize, where })}`;
    const cached = this.cacheGet<{ items: unknown[]; total: number; page: number; pageSize: number }>(cacheKey);
    if (cached) return cached;

    const delegate = this.delegate(model);
    const [items, total] = await Promise.all([
      delegate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      delegate.count({ where }),
    ]);

    const result = { items, total, page, pageSize };
    // Yalnızca arama yok ve isActive filtresi standartsa cache'le
    if (!query.search) {
      this.cacheSet(cacheKey, result);
    }
    return result;
  }

  async create(model: OrgModel, data: Record<string, unknown>, actor: { userId: string; ip?: string; userAgent?: string }) {
    const delegate = this.delegate(model);
    const created = await delegate.create({ data });
    await this.audit.log({
      actorUserId: actor.userId,
      action: `${model}.create`,
      entityType: model,
      entityId: created.id,
      after: created,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });
    this.cacheInvalidate(model); // cache temizle
    return created;
  }

  async find(model: OrgModel, id: string) {
    const delegate = this.delegate(model);
    const record = await delegate.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`${model} bulunamadı.`);
    }
    return record;
  }

  async update(model: OrgModel, id: string, data: Record<string, unknown>, actor: { userId: string; ip?: string; userAgent?: string }) {
    const delegate = this.delegate(model);
    const before = await delegate.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`${model} bulunamadı.`);
    }
    const updated = await delegate.update({ where: { id }, data });
    await this.audit.log({
      actorUserId: actor.userId,
      action: `${model}.update`,
      entityType: model,
      entityId: id,
      before,
      after: updated,
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });
    this.cacheInvalidate(model); // cache temizle
    return updated;
  }

  async remove(model: OrgModel, id: string, actor: { userId: string; ip?: string; userAgent?: string }) {
    const delegate = this.delegate(model);
    const before = await delegate.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException(`${model} bulunamadı.`);
    }
    try {
      await delegate.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException(`${model} üzerinde bağlı kayıtlar var, silinemiyor.`);
    }
    await this.audit.log({
      actorUserId: actor.userId,
      action: `${model}.delete`,
      entityType: model,
      entityId: id,
      before,
      result: 'SUCCESS',
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    });
    this.cacheInvalidate(model); // cache temizle
    return { id };
  }

  groups(): Array<{ route: string; model: OrgModel }> {
    return Object.entries(ROUTE_TO_MODEL).map(([route, model]) => ({ route, model }));
  }

  static modelFromRoute(route: string): OrgModel | undefined {
    return ROUTE_TO_MODEL[route];
  }
}