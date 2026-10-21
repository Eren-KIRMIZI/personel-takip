import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { useAuthStore } from './stores/auth';
import { queryClient } from './lib/query-client';
import { initTheme } from './stores/theme';
import { runWarmUp, prefetchCoreData, logPerformanceSummary } from './lib/warm-up-engine';
import { BootScreen } from './components/boot-screen';
import type { WarmUpProgress } from './lib/warm-up-engine';
import './index.css';

initTheme();

// Yeni deployment sonrasi eski chunk 404 hatasi alinirsa sayfayi temizce yeniler
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// ─── Boot Orchestrator ────────────────────────────────────────────────────────
/**
 * Smart Warm-Up Engine ile Phoenix boot screen'i baglayan sarmalayici.
 *
 * Akis:
 *   1. Auth initialize edilir (Supabase session kontrolu)
 *   2. Boot screen gosterilir, engine paralelde calisir
 *   3. Kimlik dogrulanmissa yetki bilgisi ile adaptive plan olusturulur
 *   4. Phase 1 → Phase 2 tamamlaninca uygulama acilir
 *   5. Phase 3 (agir sayfalar) idle callback ile arka planda devam eder
 */
function AppWithBoot() {
  const [bootDone, setBootDone] = useState(false);
  const [progress, setProgress] = useState<WarmUpProgress>({
    phase: 1,
    percent: 0,
    step: 'Sistem baslatiliyor...',
    checks: [
      { label: 'Kimlik dogrulama', done: false },
      { label: 'Kullanici yetkileri', done: false },
      { label: 'Sistem bilesenleri', done: false },
      { label: 'Sayfa verileri', done: false },
    ],
  });
  const started = useRef(false);

  const handleBootMount = useCallback(async () => {
    if (started.current) return;
    started.current = true;

    // 1. Auth hazirlanmasi
    await useAuthStore.getState().initialize();
    const profile = useAuthStore.getState().profile;
    const permissions = profile?.permissions ?? [];

    // 2. Core data prefetch (parallel - kimlik dogrulandiysa)
    if (permissions.length > 0) {
      void prefetchCoreData();
    }

    // 3. Warm-up engine calistir
    await runWarmUp(permissions, (p) => setProgress(p));

    // 4. Performans ozeti (yalnizca dev modda)
    logPerformanceSummary();
  }, []);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
  }, []);

  // Boot baslat (bilesenin ilk render'inda)
  React.useEffect(() => {
    void handleBootMount();
  }, [handleBootMount]);

  return (
    <>
      {/* Boot screen — bootDone olana kadar goster */}
      {!bootDone && (
        <BootScreen
          progress={progress}
          onComplete={handleBootComplete}
        />
      )}
      {/* Uygulama — her zaman render edilir (arkaplanda hazirlanir) */}
      <div style={{ visibility: bootDone ? 'visible' : 'hidden', position: bootDone ? 'static' : 'fixed', inset: 0 }}>
        <RouterProvider router={router} />
      </div>
    </>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWithBoot />
    </QueryClientProvider>
  </React.StrictMode>,
);