import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface SupabaseClaims {
  sub: string;
  email?: string;
  phone?: string;
  iss?: string;
  aud?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Supabase Admin SDK ile token'ı doğrular.
   * Bu yöntem tüm JWT formatlarını (HS256, ES256, yeni sb_ prefix vb.) otomatik destekler.
   */
  async verifyToken(token: string): Promise<SupabaseClaims> {
    try {
      const { data, error } = await this.supabaseService.adminClient.auth.getUser(token);
      if (error || !data?.user) {
        console.error('[Auth] Supabase token verification failed:', error?.message);
        throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
      }
      return {
        sub: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        iss: `${this.config.get<string>('SUPABASE_URL')}/auth/v1`,
        aud: 'authenticated',
        role: data.user.role,
      };
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rp of userRole.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    return {
      userId: user.id,
      authId,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      roles: user.roles.map((r) => r.role.code),
      permissions,
    };
  }

  private usernameFromClaims(claims: SupabaseClaims, authId: string): string {
    if (claims.email) {
      const base = claims.email.split('@')[0] ?? 'user';
      return base.replace(/[^a-zA-Z0-9_.-]/g, '_');
    }
    return `user_${authId.slice(0, 8)}`;
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