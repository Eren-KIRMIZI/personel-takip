import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { useAuthStore } from './stores/auth';
import { queryClient } from './lib/query-client';
import './index.css';

// Yeni deployment sonrası eski chunk 404 hatası alınırsa sayfayı temizce yeniler
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

void useAuthStore.getState().initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);