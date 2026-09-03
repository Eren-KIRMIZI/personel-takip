import { queryClient } from './query-client';
import { reportsApi } from '@/features/raporlar/api';
import { orgApi } from '@/features/organizasyon/api';
import { useAuthStore } from '@/stores/auth';

/**
 * Giriş ekranı açıldığında sessizce en sık kullanılan sayfa JS parçalarını (chunk) indirir.
 * Kullanıcı e-posta ve şifresini yazarken bu işlem arka planda biter.
 * Sıfır bekleme süresi oluşturur.
 */
export function prefetchWarmupChunks() {
  try {
    void import('@/components/layout/app-layout');
    void import('@/pages/dashboard-page');
    void import('@/pages/personel/personel-list-page');
  } catch {
    // Sessiz hata yönetimi
  }
}

/**
 * Giriş başarılı olduğu anda Dashboard ve temel dropdown verilerini önceden çeker.
 * maxWaitMs ile sınırlanmıştır (varsayılan 1000ms - 1 saniye).
 * İstekler daha hızlı biterse anında döner, asla kullanıcıyı gereksiz bekletmez.
 */
export async function prefetchCriticalData(maxWaitMs = 1000): Promise<void> {
  const prefetchPromise = Promise.allSettled([
    // 1. Kullanıcı profili ve yetkileri
    useAuthStore.getState().refreshProfile(),

    // 2. Dashboard istatistikleri (Girişteki kartlar için)
    queryClient.prefetchQuery({
      queryKey: ['raporlar', 'summary'],
      queryFn: () => reportsApi.summary(),
      staleTime: 2 * 60 * 1000,
    }),

    // 3. Departman listesi (Filtreler ve formlar için)
    queryClient.prefetchQuery({
      queryKey: ['departments-all'],
      queryFn: () => orgApi.list('departments', { pageSize: 200 }),
      staleTime: 5 * 60 * 1000,
    }),
  ]);

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, maxWaitMs));

  // Hangisi önce biterse: ya veriler hazır olduğunda ya da max süre dolduğunda devam et
  await Promise.race([prefetchPromise, timeoutPromise]);
}
