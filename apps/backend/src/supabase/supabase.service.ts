import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
  private admin: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceRoleKey) {
      this.admin = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  onModuleDestroy(): void {
    this.admin = null;
  }

  get adminClient(): SupabaseClient {
    if (!this.admin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY yapılandırılmamış.');
    }
    return this.admin;
  }

  /** Kullanıcıyı Supabase Auth içinde oluşturur; dönen authId user tablosuna yazılır. */
  async createAuthUser(email: string, password: string, displayName?: string): Promise<{ authId: string; email: string }> {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });
    if (error) {
      throw new Error(`Supabase Auth kullanıcı oluşturulamadı: ${error.message}`);
    }
    if (!data?.user) {
      throw new Error('Supabase Auth kullanıcı oluşturulamadı: kullanıcı yok.');
    }
    return { authId: data.user.id, email: data.user.email ?? email };
  }
}