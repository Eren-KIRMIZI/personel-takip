import { queryClient } from './query-client';
import { STALE } from './query-client';
import { reportsApi } from '@/features/raporlar/api';
import { orgApi } from '@/features/organizasyon/api';
import { useAuthStore } from '@/stores/auth';

/**
 * Giriş ekranı açıldığında temel parçaları hafifçe başlatır.
 * Sadece layout ve login chunk'ı — diğer sayfalar lazy kalır.
 */
export function prefetchWarmupChunks() {
  try {
    void import('@/components/layout/app-layout');
  } catch {
    // Sessiz hata yönetimi
  }
}

export interface ProgressState {
  percent: number;
  message: string;
}

/**
 * Giriş sonrası temel veri ön yüklemesi.
 *
 * Önceki davranış: 15 saniye boyunca tüm sayfa chunk'larını ve
 * endpoint'leri körlemesine yükleyen agresif bir prefetch.
 *
 * Yeni davranış:
 *  1. Kullanıcı profili + yetkileri
 *  2. Dropdown'lar için org verileri (departman, birim, unvan, lokasyon)
 *  3. Dashboard istatistikleri
 *  → Sadece bunlar. Diğer sayfaların verileri o sayfaya gidilince yüklenir.
 *
 * Sayfa JS chunk'ları artık burada pre-import edilmiyor.
 * React Router + Vite'ın lazy loading mekanizması yeterince hızlı.
 */
export async function prefetchEverything(
  onProgress: (state: ProgressState) => void,
  targetDurationMs = 4000,
): Promise<void> {
  const startTime = Date.now();

  onProgress({ percent: 15, message: 'Kimlik doğrulandı, güvenli oturum açılıyor…' });

  // 1. Temel verileri paralel çek
  const backgroundWork = Promise.allSettled([
    // Kullanıcı profili ve yetkileri
    useAuthStore.getState().refreshProfile(),

    // Dashboard istatistikleri
    queryClient.prefetchQuery({
      queryKey: ['raporlar', 'summary'],
      queryFn: () => reportsApi.summary(),
      staleTime: STALE.SHORT_DATA,
    }),

    // Org verileri — dropdown'lar her sayfada lazım, 30 dk cache'le
    queryClient.prefetchQuery({
      queryKey: ['departments-all'],
      queryFn: () => orgApi.list('departments', { pageSize: 200 }),
      staleTime: STALE.ORG_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: ['units-all'],
      queryFn: () => orgApi.list('units', { pageSize: 200 }),
      staleTime: STALE.ORG_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: ['locations-all'],
      queryFn: () => orgApi.list('work-locations', { pageSize: 200 }),
      staleTime: STALE.ORG_DATA,
    }),
    queryClient.prefetchQuery({
      queryKey: ['titles-all'],
      queryFn: () => orgApi.list('titles', { pageSize: 200 }),
      staleTime: STALE.ORG_DATA,
    }),

    // Layout chunk — her navigasyonda lazım
    import('@/components/layout/app-layout'),
    import('@/pages/dashboard-page'),
  ]);

  // 2. İlerleme mesajları
  const steps: Array<{ atMs: number; percent: number; message: string }> = [
    { atMs: 1000, percent: 40, message: 'Hesap bilgileri alınıyor…' },
    { atMs: 2500, percent: 70, message: 'Organizasyon verileri önbelleğe alınıyor…' },
    { atMs: targetDurationMs - 500, percent: 90, message: 'Çalışma alanı hazırlanıyor…' },
  ];

  for (const step of steps) {
    const elapsed = Date.now() - startTime;
    if (elapsed < step.atMs) {
      await new Promise((r) => setTimeout(r, step.atMs - elapsed));
    }
    onProgress({ percent: step.percent, message: step.message });
  }

  // 3. Arka plan işlerini bekle (en fazla targetDurationMs)
  await Promise.race([
    backgroundWork,
    new Promise((r) => setTimeout(r, targetDurationMs)),
  ]);

  // 4. Hedef süreye tamamla
  const totalElapsed = Date.now() - startTime;
  if (totalElapsed < targetDurationMs) {
    await new Promise((r) => setTimeout(r, targetDurationMs - totalElapsed));
  }

  onProgress({ percent: 100, message: 'Hazır! Yönlendiriliyorsunuz…' });
  await new Promise((r) => setTimeout(r, 300));
}
