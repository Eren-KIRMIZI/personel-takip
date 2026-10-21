import { createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../common/cache/cache.keys';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface SupabaseClaims {
  sub: string;
  email?: string;
  phone?: string;
  iss?: string;
  aud?: string;
  role?: string;
}

interface SerializedUser extends Omit<AuthenticatedUser, 'permissions'> {
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Supabase Admin SDK ile token'ı doğrular.
   * Redis önbelleği sayesinde her API isteğinde uzak Supabase sunucusuna HTTP isteği atılmaz.
   */
  async verifyToken(token: string): Promise<SupabaseClaims> {
    const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 24);
    const cacheKey = CacheKeys.authToken(tokenHash);

    const cached = await this.cache.get<SupabaseClaims>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.supabaseService.adminClient.auth.getUser(token);
      if (error || !data?.user) {
        console.error('[Auth] Supabase token verification failed:', error?.message);
        throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
      }
      const claims: SupabaseClaims = {
        sub: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        iss: `${this.config.get<string>('SUPABASE_URL')}/auth/v1`,
        aud: 'authenticated',
        role: data.user.role,
      };

      await this.cache.set(cacheKey, claims, CacheTTL.AUTH_TOKEN);
      return claims;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      console.error('[Auth] Token verification error:', err);
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
    }
  }

  async resolveUser(claims: SupabaseClaims): Promise<AuthenticatedUser> {
    const authId = claims.sub;
    if (!authId) {
      throw new UnauthorizedException('Token kullanıcı bilgisi içermiyor.');
    }

    const cacheKey = CacheKeys.authUser(authId);
    const cached = await this.cache.get<SerializedUser>(cacheKey);
    if (cached) {
      return {
        ...cached,
        permissions: new Set(cached.permissions),
      };
    }

    let user = await this.prisma.user.findUnique({
      where: { authId },
      include: userInclude,
    });

    if (!user) {
      // İlk girişte kullanıcı kaydını otomatik oluştur (lazy provisioning)
      const username = this.usernameFromClaims(claims, authId);
      try {
        user = await this.prisma.user.create({
          data: {
            authId,
            username,
            email: claims.email ?? null,
          },
          include: userInclude,
        });
      } catch {
        // eşzamanlı isteklerde race -> tekrar oku
        user = (await this.prisma.user.findUnique({
          where: { authId },
          include: userInclude,
        }))!;
      }
    }

    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır.');
    }

    // lastLoginAt debounce: son güncellemenin üzerinden 1 saat geçmediyse DB'ye yazma.
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const shouldUpdateLogin =
      !user.lastLoginAt ||
      Date.now() - new Date(user.lastLoginAt).getTime() > ONE_HOUR_MS;

    if (shouldUpdateLogin) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rp of userRole.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    const scope = await this.resolveScope(user.employeeId);

    const authenticatedUser: AuthenticatedUser = {
      userId: user.id,
      authId,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      departmentId: scope.departmentId,
      unitId: scope.unitId,
      companyId: scope.companyId,
      roles: user.roles.map((r) => r.role.code),
      permissions,
    };

    // Kullanıcı yetki ve kapsamını 3 dakika boyunca Redis'te tut
    await this.cache.set(
      cacheKey,
      { ...authenticatedUser, permissions: Array.from(permissions) },
      CacheTTL.AUTH_USER,
    );

    return authenticatedUser;
  }

  /**
   * Kullanıcının bağlı çalışanının organizasyon kapsamını çözer.
   * departmentId / unitId / companyId, rol bazlı satır kapsamlama (scoping) için kullanılır.
   */
  private async resolveScope(employeeId?: string | null): Promise<{
    departmentId: string | null;
    unitId: string | null;
    companyId: string | null;
  }> {
    if (!employeeId) {
      return { departmentId: null, unitId: null, companyId: null };
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        departmentId: true,
        unitId: true,
        department: { select: { companyId: true } },
      },
    });
    if (!employee) {
      return { departmentId: null, unitId: null, companyId: null };
    }
    return {
      departmentId: employee.departmentId ?? null,
      unitId: employee.unitId ?? null,
      companyId: employee.department?.companyId ?? null,
    };
  }

  private usernameFromClaims(claims: SupabaseClaims, authId: string): string {
    if (claims.email) {
      const base = claims.email.split('@')[0] ?? 'user';
      return base.replace(/[^a-zA-Z0-9_.-]/g, '_');
    }
    return `user_${authId.slice(0, 8)}`;
  }

  /**
   * Cold start uyandırma mikro sorgusu.
   * Vercel Serverless container'ını ve Prisma/Supabase PostgreSQL bağlantı havuzunu ısıtır.
   */
  async warmupDatabase(): Promise<{ status: string; latencyMs: number; timestamp: string }> {
    const t0 = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'hot',
      latencyMs: Date.now() - t0,
      timestamp: new Date().toISOString(),
    };
  }
}

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;