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
      { path: 'roller', element: <RollerPage /> },
      { path: 'kullanicilar', element: <KullanicilarPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);