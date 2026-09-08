import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// PowerShell echo bazen BOM (U+FEFF) veya whitespace ekleyebilir.
// Bu karakterler fetch header'larında ISO-8859-1 hatasına yol açar.
function sanitizeEnv(value: string | undefined): string {
  return (value ?? '').replace(/^\uFEFF/, '').trim();
}

const url = sanitizeEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = sanitizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanimli degil.');
}

// "Beni hatırla" davranışı için istemci, seçilen storage'ta yeniden oluşturulur.
// localStorage = tarayıcı kapansa bile oturum kalır; sessionStorage = sekme kapanınca biter.
let activeStorage: Storage = localStorage;

let supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Oturum depolamasını değiştirir. Storage aynıysa istemci yeniden kurulmaz. */
export function configureAuthStorage(storage: Storage): boolean {
  if (storage === activeStorage) {
    return false;
  }
  activeStorage = storage;
  supabase = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return true;
}

export { supabase };