import { useEffect, useRef } from 'react';
import { useQuery, type UseQueryOptions, type UseQueryResult, type QueryFunctionContext } from '@tanstack/react-query';

/**
 * Sayfa-bağlı query hook'u.
 *
 * Standart `useQuery`'nin üzerine şunları ekler:
 *  1. Component unmount olunca (sayfa değişince) in-flight fetch'ler iptal edilir.
 *  2. queryFn otomatik olarak AbortSignal alır — `api()` bunu fetch'e iletir.
 *
 * Kullanım:
 * ```tsx
 * const { data } = usePageQuery({
 *   queryKey: ['employees', params],
 *   queryFn: ({ signal }) => employeesApi.list(params, { signal }),
 * });
 * ```
 *
 * NOT: Sadece ağır, sayfa bazlı GET isteklerinde kullan.
 * Mutation'lar, küçük dropdown sorguları için standart `useQuery` yeterli.
 */
export function usePageQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const abortRef = useRef<AbortController | null>(null);

  // Her yeni queryKey için önceki controller'ı iptal et
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    abortRef.current = new AbortController();

    return () => {
      // Component unmount → in-flight istekleri iptal et
      abortRef.current?.abort();
      abortRef.current = null;
    };
  // queryKey array'ini string'e çevirip karşılaştırıyoruz
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options.queryKey)]);

  return useQuery<TData, TError>({
    ...options,
    queryFn: options.queryFn
      ? (ctx: QueryFunctionContext) => {
          // TanStack Query kendi signal'ını zaten sağlar,
          // biz ek olarak sayfa-bazlı controller'ımızı da ekliyoruz
          const pageSignal = abortRef.current?.signal;
          const combinedSignal = pageSignal ?? ctx.signal;
          const originalFn = options.queryFn as (ctx: QueryFunctionContext) => Promise<TData>;
          return originalFn({ ...ctx, signal: combinedSignal });
        }
      : undefined,
  });
}
