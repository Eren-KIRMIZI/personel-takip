import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(url, anonKey);