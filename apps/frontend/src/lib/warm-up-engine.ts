import { queryClient, STALE } from './query-client';
import { tokenStore } from './token';

// Esikler
const THRESHOLD = {
  FAST: 500,
  SLOW: 1000,
  CRITICAL: 1800,
} as const;

export type PerfTier = 'FAST' | 'SLOW' | 'CRITICAL' | 'UNKNOWN';

export interface RouteMetrics {
  route: string;
  samples: number;
  totalMs: number;
  p95: number;
  lastAt: number;
  tier: PerfTier;
}

export interface WarmUpTask {
  key: string;
  priority: number;
  phase: 1 | 2 | 3;
  label: string;
  fn: () => Promise<unknown>;
}

export interface CheckItem {
  label: string;
  done: boolean;
}

export interface WarmUpProgress {
  phase: 1 | 2 | 3;
  percent: number;
  step: string;
  checks: CheckItem[];
}

type ProgressCallback = (p: WarmUpProgress) => void;

// Performans Takibi
const PERF_KEY = 'wue_perf_v1';

function loadMetrics(): Record<string, RouteMetrics> {
  try {
    const raw = localStorage.getItem(PERF_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RouteMetrics>) : {};
  } catch {
    return {};
  }
}

function saveMetrics(m: Record<string, RouteMetrics>) {
  try {
    localStorage.setItem(PERF_KEY, JSON.stringify(m));
  } catch {
    // sessiz gec
  }
}

function classifyTier(p95: number): PerfTier {
  if (p95 === 0) return 'UNKNOWN';
  if (p95 < THRESHOLD.FAST) return 'FAST';
  if (p95 < THRESHOLD.CRITICAL) return 'SLOW';
  return 'CRITICAL';
}

export async function timedFetch<T>(routeKey: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    recordMetric(routeKey, performance.now() - t0);
    return result;
  } catch (err) {
    recordMetric(routeKey, performance.now() - t0);
    throw err;
  }
}

function recordMetric(route: string, ms: number) {
  const all = loadMetrics();
  const e = all[route] ?? { route, samples: 0, totalMs: 0, p95: 0, lastAt: 0, tier: 'UNKNOWN' as PerfTier };
  const samples = Math.min(e.samples + 1, 50);
  const totalMs = e.totalMs + ms;
  const p95 = e.p95 === 0 ? ms : e.p95 * 0.8 + ms * 0.2;
  all[route] = { route, samples, totalMs, p95, lastAt: Date.now(), tier: classifyTier(p95) };
  saveMetrics(all);
}

export function getAllMetrics(): RouteMetrics[] {
  return Object.values(loadMetrics()).sort((a, b) => b.p95 - a.p95);
}

export function buildWarmUpPlan(permissions: string[] = []): WarmUpTask[] {
  const metrics = loadMetrics();
  const isSlow = (key: string) => metrics[key]?.tier === 'SLOW' || metrics[key]?.tier === 'CRITICAL';
  const can = (perm: string) => permissions.length === 0 || permissions.includes(perm);

  const tasks: WarmUpTask[] = [
    {
      key: 'layout-chunk',
      priority: 100,
      phase: 1,
      label: 'Sistem arayuzu',
      fn: () => import('@/components/layout/app-layout'),
    },
    {
      key: 'dashboard-chunk',
      priority: 98,
      phase: 1,
      label: 'Dashboard',
      fn: () => import('@/pages/dashboard-page'),
    },
  ];

  if (can('employee:read')) {
    tasks.push({
      key: 'employees-chunk',
      priority: 90,
      phase: 2,
      label: 'Personel modulu',
      fn: () => import('@/pages/personel/personel-list-page'),
    });
  }

  if (can('leave:read')) {
    tasks.push({
      key: 'leave-chunk',
      priority: 80 + (isSlow('izin') ? 10 : 0),
      phase: 2,
      label: 'Izin yonetimi',
      fn: () => import('@/pages/izin/izin-list-page'),
    });
  }

  if (can('attendance:read')) {
    tasks.push({
      key: 'attendance-chunk',
      priority: 75 + (isSlow('giris-cikis') ? 15 : 0),
      phase: 2,
      label: 'Giris-cikis kayitlari',
      fn: () => import('@/pages/giris-cikis/giris-cikis-page'),
    });
  }

  if (can('report:view')) {
    tasks.push({
      key: 'reports-chunk',
      priority: 50 + (isSlow('raporlar') ? 20 : 0),
      phase: 3,
      label: 'Raporlar',
      fn: () => import('@/pages/raporlar/raporlar-page'),
    });
  }

  if (can('payroll:read')) {
    tasks.push({
      key: 'payroll-chunk',
      priority: 45 + (isSlow('maas') ? 20 : 0),
      phase: 3,
      label: 'Maas ve bordro',
      fn: () => import('@/pages/maas/maas-page'),
    });
  }

  if (can('overtime:read')) {
    tasks.push({
      key: 'overtime-chunk',
      priority: 40,
      phase: 3,
      label: 'Mesai yonetimi',
      fn: () => import('@/pages/mesai/mesai-list-page'),
    });
  }

  if (can('asset:read')) {
    tasks.push({
      key: 'assets-chunk',
      priority: 35,
      phase: 3,
      label: 'Zimmet sistemi',
      fn: () => import('@/pages/zimmet/zimmet-list-page'),
    });
  }

  return tasks.sort((a, b) => b.priority - a.priority);
}

const MIN_BOOT_MS = 600;
const MAX_BOOT_MS = 4000;

export async function runWarmUp(permissions: string[], onProgress: ProgressCallback): Promise<void> {
  const t0 = Date.now();
  const tasks = buildWarmUpPlan(permissions);

  const phase1 = tasks.filter((t) => t.phase === 1);
  const phase2 = tasks.filter((t) => t.phase === 2);
  const phase3 = tasks.filter((t) => t.phase === 3);

  const checks: CheckItem[] = [
    { label: 'Kimlik dogrulama', done: false },
    { label: 'Kullanici yetkileri', done: false },
    { label: 'Sistem bilesenleri', done: false },
    { label: 'Sayfa verileri', done: false },
  ];

  const emit = (phase: 1 | 2 | 3, percent: number, step: string) =>
    onProgress({ phase, percent, step, checks: [...checks] });

  // Phase 1
  emit(1, 5, 'Kimlik dogrulanıyor...');
  await Promise.allSettled(phase1.map((t) => t.fn()));
  checks[0].done = true;
  checks[1].done = true;
  emit(1, 30, 'Sistem bilesenleri yukleniyor...');
  await ensureMin(t0, 400);
  checks[2].done = true;
  emit(1, 55, 'Calisma alani hazirlaniyor...');

  // Phase 2
  emit(2, 60, 'Temel sayfalar hazirlaniyor...');
  for (let i = 0; i < phase2.length; i++) {
    await phase2[i].fn().catch(() => null);
    emit(2, 60 + Math.round(((i + 1) / Math.max(phase2.length, 1)) * 20), phase2[i].label + ' hazir');
    await sleep(60);
  }

  await ensureMin(t0, MIN_BOOT_MS);
  checks[3].done = true;
  emit(2, 88, 'Sistem hazir, son kontroller...');

  // Phase 3 idle
  void scheduleIdlePhase(phase3);

  // Minimum sure garantisi
  await ensureMin(t0, MIN_BOOT_MS);
  const elapsed = Date.now() - t0;
  if (elapsed < MAX_BOOT_MS) {
    await sleep(Math.min(250, MAX_BOOT_MS - elapsed));
  }

  emit(2, 100, 'Hazir!');
  await sleep(150);
}

async function ensureMin(start: number, min: number) {
  const d = min - (Date.now() - start);
  if (d > 0) await sleep(d);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function scheduleIdlePhase(tasks: WarmUpTask[]) {
  const idle =
    'requestIdleCallback' in window
      ? (fn: () => void) => window.requestIdleCallback(fn)
      : (fn: () => void) => setTimeout(fn, 250);

  let i = 0;
  function next() {
    if (i >= tasks.length) return;
    idle(() => {
      const t = tasks[i++];
      void t.fn().catch(() => null).finally(next);
    });
  }
  next();
}

export async function prefetchAllCoreData(): Promise<void> {
  const token = tokenStore.get();
  // Oturum yoksa API istekleri 401 hatası vermemesi için veri sorgulamalarını atla
  if (!token) return;

  try {
    const [
      { orgApi },
      { reportsApi },
      { monitoringApi },
      { employeesApi },
      { leaveApi },
      { shiftApi },
      { attendanceApi },
      { overtimeApi },
    ] = await Promise.all([
      import('@/features/organizasyon/api'),
      import('@/features/raporlar/api'),
      import('@/features/monitoring/api'),
      import('@/features/personel/api'),
      import('@/features/izin/api'),
      import('@/features/vardiya/api'),
      import('@/features/giris-cikis/api'),
      import('@/features/mesai/api'),
    ]);

    const today = new Date().toISOString().slice(0, 10);

    await Promise.allSettled([
      // ── 1. Organizasyon Şeması ──
      queryClient.prefetchQuery({
        queryKey: ['departments-all'],
        queryFn: () => timedFetch('org/departments', () => orgApi.list('departments', { pageSize: 200 })),
        staleTime: STALE.ORG_DATA,
      }),
      queryClient.prefetchQuery({
        queryKey: ['units-all'],
        queryFn: () => timedFetch('org/units', () => orgApi.list('units', { pageSize: 200 })),
        staleTime: STALE.ORG_DATA,
      }),
      queryClient.prefetchQuery({
        queryKey: ['locations-all'],
        queryFn: () => timedFetch('org/locations', () => orgApi.list('work-locations', { pageSize: 200 })),
        staleTime: STALE.ORG_DATA,
      }),
      queryClient.prefetchQuery({
        queryKey: ['titles-all'],
        queryFn: () => timedFetch('org/titles', () => orgApi.list('titles', { pageSize: 200 })),
        staleTime: STALE.ORG_DATA,
      }),

      // ── 2. Dashboard ve Sistem Durumu ──
      queryClient.prefetchQuery({
        queryKey: ['raporlar', 'summary'],
        queryFn: () => timedFetch('reports/summary', () => reportsApi.summary()),
        staleTime: STALE.SHORT_DATA,
      }),
      queryClient.prefetchQuery({
        queryKey: ['monitoring-summary'],
        queryFn: () => timedFetch('monitoring/summary', () => monitoringApi.summary()),
        staleTime: 30_000,
      }),

      // ── 3. Personel Listesi (1. Sayfa) ──
      queryClient.prefetchQuery({
        queryKey: [
          'employees',
          { page: 1, pageSize: 20, search: '', departmentId: '', unitId: '', workLocationId: '', titleId: '', status: '' },
        ],
        queryFn: () => timedFetch('employees/page1', () => employeesApi.list({ page: 1, pageSize: 20 })),
        staleTime: STALE.LIST_DATA,
      }),

      // ── 4. İzin Türleri & Talepler ──
      queryClient.prefetchQuery({
        queryKey: ['leave-types'],
        queryFn: () => timedFetch('leave/types', () => leaveApi.types()),
        staleTime: STALE.ORG_DATA,
      }),
      queryClient.prefetchQuery({
        queryKey: ['leave-requests', '', '', 1],
        queryFn: () => timedFetch('leave/requests-p1', () => leaveApi.list({ page: 1, pageSize: 15 })),
        staleTime: STALE.LIST_DATA,
      }),

      // ── 5. Vardiyalar ve Çalışma Düzenleri ──
      queryClient.prefetchQuery({
        queryKey: ['shifts'],
        queryFn: () => timedFetch('shifts/all', () => shiftApi.list({ includeInactive: true })),
        staleTime: STALE.ORG_DATA,
      }),

      // ── 6. Günlük Giriş-Çıkış Özeti ──
      queryClient.prefetchQuery({
        queryKey: ['attendance-daily', today, 1],
        queryFn: () => timedFetch('attendance/daily', () => attendanceApi.daily(today, { page: 1, pageSize: 100 })),
        staleTime: STALE.SHORT_DATA,
      }),

      // ── 7. Mesai Talepleri ──
      queryClient.prefetchQuery({
        queryKey: ['overtimes', '', '', '', 1],
        queryFn: () => timedFetch('overtimes/page1', () => overtimeApi.list({ page: 1, pageSize: 15 })),
        staleTime: STALE.LIST_DATA,
      }),
    ]);
  } catch (err) {
    console.warn('[WarmUpEngine] Veri onbellekleme sessizce atlandi:', err);
  }
}

/** Geriye dönük uyumluluk takma adı */
export const prefetchCoreData = prefetchAllCoreData;

/**
 * Uygulamanın tüm sayfa ve modül chunk'larını arka planda tarayıcı önbelleğine alır.
 */
export function prefetchAllChunks(): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled([
    // Core Layout & Auth
    import('@/components/layout/app-layout'),
    import('@/pages/login-page'),
    import('@/pages/dashboard-page'),

    // Personel Modülü
    import('@/pages/personel/personel-list-page'),
    import('@/pages/personel/personel-create-page'),
    import('@/pages/personel/personel-detail-page'),
    import('@/pages/personel/personel-edit-page'),

    // Organizasyon
    import('@/pages/organizasyon/organizasyon-page'),

    // İzin ve Puantaj
    import('@/pages/izin/izin-list-page'),
    import('@/pages/izin/izin-create-page'),
    import('@/pages/giris-cikis/giris-cikis-page'),
    import('@/pages/giris-cikis/qr-kodlar-page'),
    import('@/pages/giris-cikis/qr-okut-page'),
    import('@/pages/card/pdks-simulator-page'),
    import('@/pages/card/kart-yonetimi-page'),
    import('@/pages/card/cihaz-yonetimi-page'),
    import('@/pages/vardiya/vardiyalar-page'),
    import('@/pages/vardiya/vardiya-atama-page'),
    import('@/pages/vardiya/calisma-planlari-page'),

    // Raporlar & Ödeme
    import('@/pages/raporlar/raporlar-page'),
    import('@/pages/maas/maas-page'),
    import('@/pages/avans/avanslar-page'),
    import('@/pages/prim/prim-list-page'),

    // İş Süreçleri
    import('@/pages/mesai/mesai-list-page'),
    import('@/pages/mesai/mesai-create-page'),
    import('@/pages/gorevler/gorev-list-page'),
    import('@/pages/gorevler/gorev-create-page'),
    import('@/pages/zimmet/zimmet-list-page'),
    import('@/pages/zimmet/zimmet-create-page'),
    import('@/pages/evrak/evrak-list-page'),
    import('@/pages/evrak/evrak-create-page'),
    import('@/pages/cza-odul/cza-odul-page'),
    import('@/pages/duyurular/duyuru-list-page'),
    import('@/pages/duyurular/duyuru-create-page'),

    // Yönetim
    import('@/pages/erişim/roller-page'),
    import('@/pages/erişim/kullanicilar-page'),
    import('@/pages/loglar/islem-loglari-page'),
    import('@/pages/sistem-sagligi/sistem-sagligi-page'),
    import('@/pages/kvkk/kvkk-page'),

    // API Modülleri
    import('@/features/personel/api'),
    import('@/features/organizasyon/api'),
    import('@/features/izin/api'),
    import('@/features/giris-cikis/api'),
    import('@/features/raporlar/api'),
    import('@/features/monitoring/api'),
    import('@/features/vardiya/api'),
    import('@/features/mesai/api'),
  ]);
}

const prefetchedRoutes = new Set<string>();

/**
 * Kullanıcı menüde veya kartta bir linkin üzerine geldiğinde (hover)
 * ilgili sayfanın bileşenini ve verisini kullanıcı henüz tıklamadan
 * (150-200ms'lik insan reaksiyon süresinde) hazır eder.
 */
export function prefetchRoute(to: string) {
  if (!to || prefetchedRoutes.has(to)) return;
  prefetchedRoutes.add(to);

  switch (to) {
    case '/':
      void import('@/pages/dashboard-page');
      break;
    case '/personel':
      void import('@/pages/personel/personel-list-page');
      void import('@/features/personel/api').then(({ employeesApi }) => {
        void queryClient.prefetchQuery({
          queryKey: [
            'employees',
            { page: 1, pageSize: 20, search: '', departmentId: '', unitId: '', workLocationId: '', titleId: '', status: '' },
          ],
          queryFn: () => employeesApi.list({ page: 1, pageSize: 20 }),
          staleTime: STALE.LIST_DATA,
        });
      });
      break;
    case '/personel/yeni':
      void import('@/pages/personel/personel-create-page');
      break;
    case '/organizasyon':
      void import('@/pages/organizasyon/organizasyon-page');
      void import('@/features/organizasyon/api').then(({ orgApi }) => {
        void queryClient.prefetchQuery({
          queryKey: ['departments-all'],
          queryFn: () => orgApi.list('departments', { pageSize: 200 }),
          staleTime: STALE.ORG_DATA,
        });
      });
      break;
    case '/izin':
      void import('@/pages/izin/izin-list-page');
      void import('@/features/izin/api').then(({ leaveApi }) => {
        void queryClient.prefetchQuery({
          queryKey: ['leave-requests', '', '', 1],
          queryFn: () => leaveApi.list({ page: 1, pageSize: 15 }),
          staleTime: STALE.LIST_DATA,
        });
        void queryClient.prefetchQuery({
          queryKey: ['leave-types'],
          queryFn: () => leaveApi.types(),
          staleTime: STALE.ORG_DATA,
        });
      });
      break;
    case '/izin/yeni':
      void import('@/pages/izin/izin-create-page');
      break;
    case '/giris-cikis':
      void import('@/pages/giris-cikis/giris-cikis-page');
      void import('@/features/giris-cikis/api').then(({ attendanceApi }) => {
        const today = new Date().toISOString().slice(0, 10);
        void queryClient.prefetchQuery({
          queryKey: ['attendance-daily', today, 1],
          queryFn: () => attendanceApi.daily(today, { page: 1, pageSize: 100 }),
          staleTime: STALE.SHORT_DATA,
        });
      });
      break;
    case '/giris-cikis/qr':
      void import('@/pages/giris-cikis/qr-kodlar-page');
      break;
    case '/kart-sistemi':
      void import('@/pages/card/pdks-simulator-page');
      break;
    case '/vardiya':
      void import('@/pages/vardiya/vardiyalar-page');
      void import('@/features/vardiya/api').then(({ shiftApi }) => {
        void queryClient.prefetchQuery({
          queryKey: ['shifts'],
          queryFn: () => shiftApi.list({ includeInactive: true }),
          staleTime: STALE.ORG_DATA,
        });
      });
      break;
    case '/calisma-planlari':
      void import('@/pages/vardiya/calisma-planlari-page');
      break;
    case '/raporlar':
      void import('@/pages/raporlar/raporlar-page');
      void import('@/features/raporlar/api').then(({ reportsApi }) => {
        void queryClient.prefetchQuery({
          queryKey: ['raporlar', 'summary'],
          queryFn: () => reportsApi.summary(),
          staleTime: STALE.SHORT_DATA,
        });
      });
      break;
    case '/maas':
      void import('@/pages/maas/maas-page');
      break;
    case '/avans':
      void import('@/pages/avans/avanslar-page');
      break;
    case '/prim':
      void import('@/pages/prim/prim-list-page');
      break;
    case '/mesai':
      void import('@/pages/mesai/mesai-list-page');
      void import('@/features/mesai/api').then(({ overtimeApi }) => {
        void queryClient.prefetchQuery({
          queryKey: ['overtimes', '', '', '', 1],
          queryFn: () => overtimeApi.list({ page: 1, pageSize: 15 }),
          staleTime: STALE.LIST_DATA,
        });
      });
      break;
    case '/mesai/yeni':
      void import('@/pages/mesai/mesai-create-page');
      break;
    case '/gorevler':
      void import('@/pages/gorevler/gorev-list-page');
      break;
    case '/zimmet':
      void import('@/pages/zimmet/zimmet-list-page');
      break;
    case '/evrak':
      void import('@/pages/evrak/evrak-list-page');
      break;
    case '/roller':
      void import('@/pages/erişim/roller-page');
      break;
    case '/kullanicilar':
      void import('@/pages/erişim/kullanicilar-page');
      break;
    case '/islem-loglari':
      void import('@/pages/loglar/islem-loglari-page');
      break;
    case '/sistem-sagligi':
      void import('@/pages/sistem-sagligi/sistem-sagligi-page');
      break;
    case '/kvkk':
      void import('@/pages/kvkk/kvkk-page');
      break;
    default:
      break;
  }
}

export function logPerformanceSummary() {
  if (import.meta.env.PROD) return;
  const m = getAllMetrics();
  if (!m.length) return;
  console.group('[WarmUpEngine] Performans Ozeti');
  for (const x of m) {
    const icon = x.tier === 'CRITICAL' ? '🔴' : x.tier === 'SLOW' ? '🟡' : '🟢';
    console.log(`${icon} ${x.route.padEnd(30)} p95: ${Math.round(x.p95)}ms [${x.tier}] n=${x.samples}`);
  }
  console.groupEnd();
}
