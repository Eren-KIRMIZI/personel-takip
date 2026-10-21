import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { useAuthStore } from './stores/auth';
import { queryClient } from './lib/query-client';
import { initTheme } from './stores/theme';
import { BootScreen } from './components/boot-screen';
import './index.css';

initTheme();

// Yeni deployment sonrasi eski chunk 404 hatasi alinirsa sayfayi temizce yeniler
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Auth oturumunu hemen başlat (BootScreen 15 saniye çalışırken arka planda session çözümlenir)
void useAuthStore.getState().initialize();

/**
 * Smart Warm-Up Orchestrator
 * - BootScreen (15 saniye, görkemli Phoenix ve aşamalı warm-up kontrol listesi)
 *   en üst katmanda (z-index 99999) render edilir.
 * - RouterProvider arka planda kesintisiz çalışarak sayfayı ve bileşenleri hazırlar.
 * - %100 tamamlanınca yumuşak bir çözünme (cross-fade) ile doğrudan giriş ekranı açılır.
 * - Asla beyaz ekran veya donma yaşanmaz.
 */
function AppWithBoot() {
  const [bootVisible, setBootVisible] = useState(true);

  const handleBootComplete = useCallback(() => {
    setBootVisible(false);
  }, []);

  return (
    <>
      {bootVisible && <BootScreen onComplete={handleBootComplete} />}
      <RouterProvider router={router} />
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