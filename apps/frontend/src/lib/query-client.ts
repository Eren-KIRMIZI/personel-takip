import { QueryClient } from '@tanstack/react-query';

/**
 * Standart staleTime politikası (ms cinsinden):
 *
 *  ORG_DATA    → 30 dk  (departman, birim, unvan: nadiren değişir)
 *  LIST_DATA   →  3 dk  (personel/izin/mesai listeleri)
 *  DETAIL_DATA →  5 dk  (personel detayı, form açılışları)
 *  SHORT_DATA  →  1 dk  (dashboard, bildirimler)
 *  SENSITIVE   →  0     (maaş, avans: her seferinde taze çek)
 */
export const STALE = {
  ORG_DATA: 30 * 60 * 1000,
  LIST_DATA: 3 * 60 * 1000,
  DETAIL_DATA: 5 * 60 * 1000,
  SHORT_DATA: 60 * 1000,
  SENSITIVE: 0,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Veri 3 dakika "taze" sayılır → sayfa değiştirince tekrar istek atılmaz
      staleTime: STALE.LIST_DATA,
      // Cache 15 dakika bellekte tutulur → geri döndüğünde anlık gösterilir
      gcTime: 15 * 60 * 1000,
    },
  },
});
