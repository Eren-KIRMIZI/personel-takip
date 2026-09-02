import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { importJWK, jwtVerify, type JWTPayload } from 'jose';
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

interface JwkKey {
  kty?: string;
  alg?: string;
  kid?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthService {
  private readonly keys: Array<Uint8Array | CryptoKey> = [];
  private readonly expectedIssuer: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const rawSecret = config.get<string>('SUPABASE_JWT_SECRET');
    if (!rawSecret) {
      throw new Error('SUPABASE_JWT_SECRET ortam değişkeni tanımlanmamış.');
    }
    // HS256: önce ham metin, sonra base64-decoded olarak dene (her iki kullanım biçimini kapsar)
    this.keys.push(new TextEncoder().encode(rawSecret));
    const decoded = this.tryBase64(rawSecret);
    if (decoded) this.keys.push(decoded);

    const jwksRaw = config.get<string>('SUPABASE_JWT_JWKS');
    if (jwksRaw) {
      try {
        const jwks = JSON.parse(jwksRaw) as { keys?: JwkKey[] };
        for (const jwk of jwks.keys ?? []) {
          if (jwk.kty && jwk.alg) {
            void importJWK(jwk as JsonWebKey, jwk.alg).then((key) => this.keys.push(key as CryptoKey));
          }
        }
      } catch (error) {
        throw new Error(`SUPABASE_JWT_JWKS ayrıştırılamadı: ${(error as Error).message}`);
      }
    }

    const base = config.get<string>('SUPABASE_URL') ?? '';
    this.expectedIssuer = `${base}/auth/v1`;
  }

  async verifyToken(token: string): Promise<SupabaseClaims> {
    for (const key of this.keys) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256', 'ES256'],
          issuer: this.expectedIssuer,
          audience: 'authenticated',
        });
        return payload as unknown as SupabaseClaims;
      } catch {
        // bir sonraki anahtarla dene
      }
    }
    throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
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

  private tryBase64(value: string): Uint8Array | null {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
    try {
      const decoded = Buffer.from(value, 'base64');
      if (decoded.length === 0) return null;
      if (Buffer.from(decoded).toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
        return null;
      }
      return new Uint8Array(decoded);
    } catch {
      return null;
    }
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