/**
 * prefetch.ts — Smart Warm-Up Engine v2 ile entegre prefetch yardimcilari.
 *
 * Bu dosya artik warm-up-engine.ts'e yonlendirme saglar.
 * Eski prefetchEverything() ve prefetchWarmupChunks() cagrilan yerler
 * geriye donuk uyumluluk icin korunmustur.
 */
export {
  prefetchCoreData as prefetchEverything,
  prefetchAllCoreData,
  prefetchAllChunks,
  prefetchRoute,
  logPerformanceSummary,
} from './warm-up-engine';

export type { WarmUpProgress as ProgressState } from './warm-up-engine';

/**
 * @deprecated Warm-Up Engine tarafindan otomatik yonetilir.
 * Geriye donuk uyumluluk icin tutuldu.
 */
export function prefetchWarmupChunks() {
  try {
    void import('@/components/layout/app-layout');
  } catch {
    // sessiz
  }
}
