import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/token';

export interface MeProfile {
  userId: string;
  username: string;
  email?: string | null;
  employeeId?: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  session: Session | null;
  profile: MeProfile | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

async function fetchProfile(): Promise<MeProfile> {
  return api<MeProfile>('/api/auth/me');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initialized: false,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    tokenStore.set(session?.access_token ?? null);
    set({ session, initialized: true });

    if (session) {
      try {
        const profile = await fetchProfile();
        set({ profile });
      } catch {
        // Profil çekilemezse oturum geçersiz demektir
        await get().signOut();
      }
    }

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      tokenStore.set(nextSession?.access_token ?? null);
      set({ session: nextSession });
      if (nextSession) {
        get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });

    window.addEventListener('auth:expired', () => {
      void get().signOut();
    });
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Kullanıcı adı veya şifre hatalı.' : error.message);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    tokenStore.set(null);
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    try {
      const profile = await fetchProfile();
      set({ profile });
    } catch {
      // sessiz geç — oturum bitiminde handle edilir
    }
  },

  hasPermission: (code: string) => {
    const { session, profile } = get();
    if (!session) return false;
    return profile?.permissions.includes(code) ?? false;
  },
}));