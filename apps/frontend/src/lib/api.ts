import { tokenStore } from './token';

// Production'da VITE_API_URL boş bırakılır — aynı Vercel domain'i kullanılır.
// Geliştirmede http://localhost:3000 kullanılır.
const _envUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const BASE_URL = _envUrl !== '' ? _envUrl : (typeof window !== 'undefined' ? window.location.origin : '');

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = tokenStore.get();
  if (token) {
    // Non-ASCII karakterleri temizle (ISO-8859-1 dışı karakter fetch hatasına yol açar)
    const safeToken = token.trim().replace(/[^\x00-\x7F]/g, '');
    if (safeToken) {
      headers.Authorization = `Bearer ${safeToken}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı.');
  }

  if (response.status === 401 && !path.includes('/auth/health')) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  const text = await response.text();
  const data = text ? safeParse(text) : undefined;

  if (!response.ok) {
    const message = extractMessage(data) ?? `İstek başarısız (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const msg = (data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return null;
}