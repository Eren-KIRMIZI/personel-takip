import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { PersonelListPage } from '@/pages/personel/personel-list-page';
import { PersonelCreatePage } from '@/pages/personel/personel-create-page';
import { PersonelDetailPage } from '@/pages/personel/personel-detail-page';
import { OrganizasyonPage } from '@/pages/organizasyon/organizasyon-page';
import { RollerPage } from '@/pages/erişim/roller-page';
import { KullanicilarPage } from '@/pages/erişim/kullanicilar-page';
import { IzinListPage } from '@/pages/izin/izin-list-page';
import { IzinCreatePage } from '@/pages/izin/izin-create-page';
import { MesaiListPage } from '@/pages/mesai/mesai-list-page';
import { MesaiCreatePage } from '@/pages/mesai/mesai-create-page';
import { GirisCikisPage } from '@/pages/giris-cikis/giris-cikis-page';
import { QrKodlarPage } from '@/pages/giris-cikis/qr-kodlar-page';
import { RaporlarPage } from '@/pages/raporlar/raporlar-page';
import { VardiyalarPage } from '@/pages/vardiya/vardiyalar-page';
import { VardiyaAtamaPage } from '@/pages/vardiya/vardiya-atama-page';
import { MaasPage } from '@/pages/maas/maas-page';
import { AvanslarPage } from '@/pages/avans/avanslar-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'personel', element: <PersonelListPage /> },
      { path: 'personel/yeni', element: <PersonelCreatePage /> },
      { path: 'personel/:id', element: <PersonelDetailPage /> },
      { path: 'organizasyon', element: <OrganizasyonPage /> },
      { path: 'izin', element: <IzinListPage /> },
      { path: 'izin/yeni', element: <IzinCreatePage /> },
      { path: 'mesai', element: <MesaiListPage /> },
      { path: 'mesai/yeni', element: <MesaiCreatePage /> },
      { path: 'giris-cikis', element: <GirisCikisPage /> },
      { path: 'giris-cikis/qr', element: <QrKodlarPage /> },
      { path: 'raporlar', element: <RaporlarPage /> },
      { path: 'vardiya', element: <VardiyalarPage /> },
      { path: 'vardiya/atama/:shiftId', element: <VardiyaAtamaPage /> },
      { path: 'maas', element: <MaasPage /> },
      { path: 'avans', element: <AvanslarPage /> },
      { path: 'roller', element: <RollerPage /> },
      { path: 'kullanicilar', element: <KullanicilarPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);