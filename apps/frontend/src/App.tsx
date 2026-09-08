import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/layout/protected-route';

// ── Layout (eager – her navigasyonda lazım) ────────────────
const AppLayout = lazy(() =>
  import('@/components/layout/app-layout').then((m) => ({ default: m.AppLayout })),
);
const LoginPage = lazy(() =>
  import('@/pages/login-page').then((m) => ({ default: m.LoginPage })),
);

// ── Page chunks ────────────────────────────────────────────
// Core (dashboard, personel – en çok kullanılanlar)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const PersonelListPage = lazy(() =>
  import('@/pages/personel/personel-list-page').then((m) => ({ default: m.PersonelListPage })),
);
const PersonelCreatePage = lazy(() =>
  import('@/pages/personel/personel-create-page').then((m) => ({ default: m.PersonelCreatePage })),
);
const PersonelDetailPage = lazy(() =>
  import('@/pages/personel/personel-detail-page').then((m) => ({ default: m.PersonelDetailPage })),
);
const PersonelEditPage = lazy(() =>
  import('@/pages/personel/personel-edit-page').then((m) => ({ default: m.PersonelEditPage })),
);

// Organizasyon
const OrganizasyonPage = lazy(() =>
  import('@/pages/organizasyon/organizasyon-page').then((m) => ({ default: m.OrganizasyonPage })),
);

// İzin
const IzinListPage = lazy(() =>
  import('@/pages/izin/izin-list-page').then((m) => ({ default: m.IzinListPage })),
);
const IzinCreatePage = lazy(() =>
  import('@/pages/izin/izin-create-page').then((m) => ({ default: m.IzinCreatePage })),
);

// Mesai
const MesaiListPage = lazy(() =>
  import('@/pages/mesai/mesai-list-page').then((m) => ({ default: m.MesaiListPage })),
);
const MesaiCreatePage = lazy(() =>
  import('@/pages/mesai/mesai-create-page').then((m) => ({ default: m.MesaiCreatePage })),
);

// Giriş-Çıkış
const GirisCikisPage = lazy(() =>
  import('@/pages/giris-cikis/giris-cikis-page').then((m) => ({ default: m.GirisCikisPage })),
);
const QrKodlarPage = lazy(() =>
  import('@/pages/giris-cikis/qr-kodlar-page').then((m) => ({ default: m.QrKodlarPage })),
);
const QrOkutPage = lazy(() =>
  import('@/pages/giris-cikis/qr-okut-page').then((m) => ({ default: m.QrOkutPage })),
);

// Kart Sistemi / PDKS
const PdksSimulatorPage = lazy(() =>
  import('@/pages/card/pdks-simulator-page').then((m) => ({ default: m.PdksSimulatorPage })),
);
const KartYonetimiPage = lazy(() =>
  import('@/pages/card/kart-yonetimi-page').then((m) => ({ default: m.KartYonetimiPage })),
);
const CihazYonetimiPage = lazy(() =>
  import('@/pages/card/cihaz-yonetimi-page').then((m) => ({ default: m.CihazYonetimiPage })),
);

// Raporlar
const RaporlarPage = lazy(() =>
  import('@/pages/raporlar/raporlar-page').then((m) => ({ default: m.RaporlarPage })),
);

// Vardiya
const VardiyalarPage = lazy(() =>
  import('@/pages/vardiya/vardiyalar-page').then((m) => ({ default: m.VardiyalarPage })),
);
const VardiyaAtamaPage = lazy(() =>
  import('@/pages/vardiya/vardiya-atama-page').then((m) => ({ default: m.VardiyaAtamaPage })),
);
const CalismaPlanlariPage = lazy(() =>
  import('@/pages/vardiya/calisma-planlari-page').then((m) => ({ default: m.CalismaPlanlariPage })),
);

// Ödeme
const MaasPage = lazy(() =>
  import('@/pages/maas/maas-page').then((m) => ({ default: m.MaasPage })),
);
const AvanslarPage = lazy(() =>
  import('@/pages/avans/avanslar-page').then((m) => ({ default: m.AvanslarPage })),
);
const PrimListPage = lazy(() =>
  import('@/pages/prim/prim-list-page').then((m) => ({ default: m.PrimListPage })),
);

// İş Süreçleri
const GorevListPage = lazy(() =>
  import('@/pages/gorevler/gorev-list-page').then((m) => ({ default: m.GorevListPage })),
);
const GorevCreatePage = lazy(() =>
  import('@/pages/gorevler/gorev-create-page').then((m) => ({ default: m.GorevCreatePage })),
);
const ZimmetListPage = lazy(() =>
  import('@/pages/zimmet/zimmet-list-page').then((m) => ({ default: m.ZimmetListPage })),
);
const ZimmetCreatePage = lazy(() =>
  import('@/pages/zimmet/zimmet-create-page').then((m) => ({ default: m.ZimmetCreatePage })),
);
const EvrakListPage = lazy(() =>
  import('@/pages/evrak/evrak-list-page').then((m) => ({ default: m.EvrakListPage })),
);
const EvrakCreatePage = lazy(() =>
  import('@/pages/evrak/evrak-create-page').then((m) => ({ default: m.EvrakCreatePage })),
);
const CzaOdulPage = lazy(() =>
  import('@/pages/cza-odul/cza-odul-page').then((m) => ({ default: m.CzaOdulPage })),
);
const DuyuruListPage = lazy(() =>
  import('@/pages/duyurular/duyuru-list-page').then((m) => ({ default: m.DuyuruListPage })),
);
const DuyuruCreatePage = lazy(() =>
  import('@/pages/duyurular/duyuru-create-page').then((m) => ({ default: m.DuyuruCreatePage })),
);

// Yönetim
const RollerPage = lazy(() =>
  import('@/pages/erişim/roller-page').then((m) => ({ default: m.RollerPage })),
);
const KullanicilarPage = lazy(() =>
  import('@/pages/erişim/kullanicilar-page').then((m) => ({ default: m.KullanicilarPage })),
);
const IslemLoglariPage = lazy(() =>
  import('@/pages/loglar/islem-loglari-page').then((m) => ({ default: m.IslemLoglariPage })),
);

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspenseWrap>
        <LoginPage />
      </SuspenseWrap>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <SuspenseWrap>
          <AppLayout />
        </SuspenseWrap>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrap>
            <DashboardPage />
          </SuspenseWrap>
        ),
      },
      {
        path: 'personel',
        element: <SuspenseWrap><PersonelListPage /></SuspenseWrap>,
      },
      {
        path: 'personel/yeni',
        element: <SuspenseWrap><PersonelCreatePage /></SuspenseWrap>,
      },
      {
        path: 'personel/:id',
        element: <SuspenseWrap><PersonelDetailPage /></SuspenseWrap>,
      },
      {
        path: 'personel/:id/duzenle',
        element: <SuspenseWrap><PersonelEditPage /></SuspenseWrap>,
      },
      {
        path: 'organizasyon',
        element: <SuspenseWrap><OrganizasyonPage /></SuspenseWrap>,
      },
      {
        path: 'izin',
        element: <SuspenseWrap><IzinListPage /></SuspenseWrap>,
      },
      {
        path: 'izin/yeni',
        element: <SuspenseWrap><IzinCreatePage /></SuspenseWrap>,
      },
      {
        path: 'mesai',
        element: <SuspenseWrap><MesaiListPage /></SuspenseWrap>,
      },
      {
        path: 'mesai/yeni',
        element: <SuspenseWrap><MesaiCreatePage /></SuspenseWrap>,
      },
      {
        path: 'giris-cikis',
        element: <SuspenseWrap><GirisCikisPage /></SuspenseWrap>,
      },
      {
        path: 'giris-cikis/qr',
        element: <SuspenseWrap><QrKodlarPage /></SuspenseWrap>,
      },
      {
        path: 'qr-okut',
        element: <SuspenseWrap><QrOkutPage /></SuspenseWrap>,
      },
      {
        path: 'kart-sistemi',
        element: <SuspenseWrap><KartYonetimiPage /></SuspenseWrap>,
      },
      {
        path: 'kart-sistemi/cihazlar',
        element: <SuspenseWrap><CihazYonetimiPage /></SuspenseWrap>,
      },
      {
        path: 'pdks-simulator',
        element: <SuspenseWrap><PdksSimulatorPage /></SuspenseWrap>,
      },
      {
        path: 'raporlar',
        element: <SuspenseWrap><RaporlarPage /></SuspenseWrap>,
      },
      {
        path: 'vardiya',
        element: <SuspenseWrap><VardiyalarPage /></SuspenseWrap>,
      },
      {
        path: 'vardiya/atama/:id',
        element: <SuspenseWrap><VardiyaAtamaPage /></SuspenseWrap>,
      },
      {
        path: 'calisma-planlari',
        element: <SuspenseWrap><CalismaPlanlariPage /></SuspenseWrap>,
      },
      {
        path: 'maas',
        element: <SuspenseWrap><MaasPage /></SuspenseWrap>,
      },
      {
        path: 'avans',
        element: <SuspenseWrap><AvanslarPage /></SuspenseWrap>,
      },
      {
        path: 'prim',
        element: <SuspenseWrap><PrimListPage /></SuspenseWrap>,
      },
      {
        path: 'cza-odul',
        element: <SuspenseWrap><CzaOdulPage /></SuspenseWrap>,
      },
      {
        path: 'zimmet',
        element: <SuspenseWrap><ZimmetListPage /></SuspenseWrap>,
      },
      {
        path: 'zimmet/yeni',
        element: <SuspenseWrap><ZimmetCreatePage /></SuspenseWrap>,
      },
      {
        path: 'gorevler',
        element: <SuspenseWrap><GorevListPage /></SuspenseWrap>,
      },
      {
        path: 'gorevler/yeni',
        element: <SuspenseWrap><GorevCreatePage /></SuspenseWrap>,
      },
      {
        path: 'gorevler/:id/duzenle',
        element: <SuspenseWrap><GorevCreatePage /></SuspenseWrap>,
      },
      {
        path: 'evrak',
        element: <SuspenseWrap><EvrakListPage /></SuspenseWrap>,
      },
      {
        path: 'evrak/yeni',
        element: <SuspenseWrap><EvrakCreatePage /></SuspenseWrap>,
      },
      {
        path: 'duyurular',
        element: <SuspenseWrap><DuyuruListPage /></SuspenseWrap>,
      },
      {
        path: 'duyurular/yeni',
        element: <SuspenseWrap><DuyuruCreatePage /></SuspenseWrap>,
      },
      {
        path: 'roller',
        element: <SuspenseWrap><RollerPage /></SuspenseWrap>,
      },
      {
        path: 'kullanicilar',
        element: <SuspenseWrap><KullanicilarPage /></SuspenseWrap>,
      },
      {
        path: 'islem-loglari',
        element: <SuspenseWrap><IslemLoglariPage /></SuspenseWrap>,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
