import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Veri 1 dakika boyunca "taze" sayılır → sayfa değiştirince tekrar istek atılmaz
      staleTime: 60 * 1000,
      // Cache 10 dakika bellekte tutulur → geri döndüğünde anlık gösterilir
      gcTime: 10 * 60 * 1000,
    },
  },
});
