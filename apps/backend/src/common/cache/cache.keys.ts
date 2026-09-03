import { createHash } from 'crypto';

/**
 * Objeyi kararlı bir hash string'e dönüştürür.
 * Cache key üretmek için kullanılır.
 */
function stableHash(obj: unknown): string {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  return createHash('md5').update(str).digest('hex').slice(0, 8);
}

/**
 * Uygulama genelindeki Redis cache key şablonları.
 * Tüm key'ler buradan üretilmeli — sihirli string yok.
 */
export const CacheKeys = {
  // ── Organizasyon (1 saat TTL) ────────────────────────────
  orgList: (model: string, query: object): string =>
    `org:${model}:list:${stableHash(query)}`,

  orgItem: (model: string, id: string): string =>
    `org:${model}:item:${id}`,

  orgPrefix: (model: string): string => `org:${model}:`,

  // ── Personel (5 dk list, 10 dk detay) ───────────────────
  employeeList: (query: object): string =>
    `employees:list:${stableHash(query)}`,

  employeeDetail: (id: string): string => `employees:detail:${id}`,

  employeeHistory: (id: string): string => `employees:history:${id}`,

  employeeListPrefix: (): string => 'employees:list:',

  // ── İzin (1 saat TTL) ────────────────────────────────────
  leaveTypes: (): string => 'leave:types',

  leaveList: (query: object): string =>
    `leave:list:${stableHash(query)}`,

  leaveListPrefix: (): string => 'leave:list:',

  // ── Vardiya (1 saat TTL) ─────────────────────────────────
  shiftList: (query: object): string =>
    `shifts:list:${stableHash(query)}`,

  shiftItem: (id: string): string => `shifts:item:${id}`,

  shiftPrefix: (): string => 'shifts:',

  workPlanList: (query: object): string =>
    `work-plans:list:${stableHash(query)}`,

  workPlanPrefix: (): string => 'work-plans:',

  // ── Auth & Session (3 dk TTL — sayfa geçişlerini hızlandırır) ────
  authToken: (tokenHash: string): string => `auth:token:${tokenHash}`,

  authUser: (authId: string): string => `auth:user:${authId}`,

  authPrefix: (): string => 'auth:',

  // ── Dashboard Özet (90 sn TTL) ───────────────────────────
  dashboardSummary: (): string => 'reports:dashboard-summary',
} as const;

/**
 * TTL sabitleri (saniye cinsinden).
 */
export const CacheTTL = {
  /** Organizasyon verileri: nadiren değişir */
  ORG: 60 * 60, // 1 saat

  /** Personel listesi: orta sıklıkta değişir */
  EMPLOYEE_LIST: 5 * 60, // 5 dakika

  /** Personel detayı: form açıldığında taze olmalı */
  EMPLOYEE_DETAIL: 10 * 60, // 10 dakika

  /** İzin türleri: nadiren değişir */
  LEAVE_TYPES: 60 * 60, // 1 saat

  /** İzin listesi: sık değişir */
  LEAVE_LIST: 2 * 60, // 2 dakika

  /** Vardiya tanımları: nadiren değişir */
  SHIFT: 60 * 60, // 1 saat

  /** Token & Session önbelleği: her istekte Supabase'e gitmeyi önler */
  AUTH_TOKEN: 3 * 60, // 3 dakika

  AUTH_USER: 3 * 60, // 3 dakika

  /** Dashboard özeti */
  DASHBOARD_SUMMARY: 90, // 1.5 dakika
} as const;
