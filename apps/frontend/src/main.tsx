import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { useAuthStore } from './stores/auth';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Veri 60 saniye boyunca "taze" sayılır → sayfa değiştirince tekrar istek atılmaz
      staleTime: 60 * 1000,
      // Cache 5 dakika bellekte tutulur → geri döndüğünde anlık gösterilir
      gcTime: 5 * 60 * 1000,
    },
  },
});

void useAuthStore.getState().initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);