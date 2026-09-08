import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, configureAuthStorage } from '@/lib/supabase';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/token';

const REMEMBER_KEY = 'pik_remember_session';

function authStorage(): Storage {
  return typeof localStorage !== 'undefined' && localStorage.getItem(REMEMBER_KEY) === '0' ? sessionStorage : localStorage;
}

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
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

async function fetchProfile(): Promise<MeProfile> {
  return api<MeProfile>('/api/auth/me');
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let idleArm: (() => void) | null = null;

const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'] as const;

function _clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function startIdleTimer(onIdle: () => void) {
  _clearIdleTimer();
  idleArm = () => {
    _clearIdleTimer();
    idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
  };
  IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, idleArm as EventListener, { passive: true }));
  idleArm();
}

function stopIdleTimer() {
  _clearIdleTimer();
  if (idleArm) {
    IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, idleArm as EventListener, true));
  }
  idleArm = null;
}

type AuthStoreApi = {
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void;
  get: () => AuthState;
};

function bindAuthStateListener(store: AuthStoreApi) {
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    tokenStore.set(nextSession?.access_token ?? null);
    store.set({ session: nextSession });
    if (nextSession) {
      store.get().refreshProfile();
      startIdleTimer(() => void store.get().signOut());
    } else {
      stopIdleTimer();
      store.set({ profile: null });
    }
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initialized: false,

  initialize: async () => {
    configureAuthStorage(authStorage());
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    tokenStore.set(session?.access_token ?? null);
    set({ session, initialized: true });

    if (session) {
      try {
        const profile = await fetchProfile();
        set({ profile });
        startIdleTimer(() => void get().signOut());
      } catch {
        // Profil çekilemezse oturum geçersiz demektir
        await get().signOut();
      }
    }

    bindAuthStateListener({ set, get });

    window.addEventListener('auth:expired', () => {
      void get().signOut();
    });
  },

  signIn: async (email: string, password: string, remember = true) => {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    if (configureAuthStorage(remember ? localStorage : sessionStorage)) {
      bindAuthStateListener({ set, get });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Kullanıcı adı veya şifre hatalı.' : error.message);
    }
  },

  signOut: async () => {
    stopIdleTimer();
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