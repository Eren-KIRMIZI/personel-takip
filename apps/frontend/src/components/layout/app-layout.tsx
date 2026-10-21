import { useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarPlus,
  Clock,
  ClockPlus,
  CalendarRange,
  CreditCard,
  FileChartColumn,
  FileText,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Package,
  QrCode,
  ScrollText,
  Shield,
  ShieldCheck,
  Scale,
  Timer,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth';
import { NotificationDropdown } from './notification-dropdown';
import { ThemeToggle } from './theme-toggle';

const HOVER_COLORS: Array<{ color: string; glow: string }> = [
  { color: '#fb923c', glow: 'rgba(251, 146, 60, 0.22)' },  // turuncu
  { color: '#f472b6', glow: 'rgba(244, 114, 182, 0.22)' }, // pembe
  { color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.22)' }, // mor
  { color: '#facc15', glow: 'rgba(250, 204, 21, 0.22)' },  // sarı
  { color: '#4ade80', glow: 'rgba(74, 222, 128, 0.22)' },  // yeşil
];

const NAV_SECTIONS: Array<{
  title: string;
  items: Array<{ to?: string; label: string; icon: React.ReactNode; soon?: boolean; permission?: string | string[] }>;
}> = [
  {
    title: 'Genel',
    items: [{ to: '/', label: 'Panel', icon: <LayoutDashboard /> }],
  },
  {
    title: 'Personel',
    items: [
      { to: '/personel',      label: 'Personel Listesi', icon: <Users />,    permission: 'employee:read' },
      { to: '/personel/yeni', label: 'Personel Ekle',    icon: <UserPlus />, permission: 'employee:write' },
    ],
  },
  {
    title: 'Organizasyon',
    items: [{ to: '/organizasyon', label: 'Departman / Birim', icon: <Building2 />, permission: 'department:read' }],
  },
  {
    title: 'İzin ve Puantaj',
    items: [
      { to: '/izin',          label: 'İzin Yönetimi',    icon: <CalendarDays />,  permission: 'leave:read' },
      { to: '/izin/yeni',     label: 'Yeni İzin Talebi', icon: <CalendarPlus />,  permission: 'leave:create' },
      { to: '/giris-cikis',   label: 'Giriş-Çıkış',      icon: <Clock />,         permission: 'attendance:read' },
      { to: '/giris-cikis/qr',label: 'QR Kodlar',         icon: <QrCode />,        permission: 'qr:read' },
      { to: '/kart-sistemi',  label: 'Kart Sistemi',      icon: <IdCard />,        permission: 'attendance:read' },
      { to: '/vardiya',       label: 'Vardiyalar',        icon: <CalendarRange />, permission: 'shift:read' },
      { to: '/calisma-planlari', label: 'Çalışma Planları', icon: <CalendarDays />, permission: 'shift:read' },
    ],
  },
  {
    title: 'Raporlar',
    items: [
      {
        to: '/raporlar',
        label: 'Raporlar',
        icon: <FileChartColumn />,
        permission: [
          'report:view',
          'attendance:read',
          'payroll:read',
          'leave:read',
          'overtime:read',
          'advance:read',
          'bonus:read',
          'employee:read',
        ],
      },
    ],
  },
  {
    title: 'Ödeme',
    items: [
      { to: '/maas',  label: 'Maaş / Bordro', icon: <Banknote />,    permission: 'payroll:read' },
      { to: '/avans', label: 'Avanslar',       icon: <CreditCard />,  permission: 'advance:read' },
      { to: '/prim',  label: 'Prim',           icon: <Banknote />,    permission: 'bonus:read' },
    ],
  },
  {
    title: 'İş Süreçleri',
    items: [
      { to: '/mesai',      label: 'Mesai',        icon: <Timer />,    permission: 'overtime:read' },
      { to: '/mesai/yeni', label: 'Mesai Ekle',   icon: <ClockPlus />,permission: 'overtime:approve' },
      { to: '/gorevler',   label: 'Görev',        icon: <Briefcase />,permission: 'task:read' },
      { to: '/zimmet',     label: 'Zimmet',       icon: <Package />,  permission: 'asset:read' },
      { to: '/evrak',      label: 'Evrak',        icon: <FileText />, permission: 'document:read' },
      { to: '/cza-odul',   label: 'Disiplin ve Teşvik', icon: <Scale />,    permission: 'employee-record:read' },
      { to: '/duyurular',  label: 'Duyurular',   icon: <Megaphone />,permission: 'announcement:read' },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { to: '/roller',        label: 'Roller ve Yetkiler', icon: <ShieldCheck />, permission: 'role:read' },
      { to: '/kullanicilar',  label: 'Kullanıcılar',       icon: <UserCog />,    permission: 'user:read' },
      { to: '/islem-loglari', label: 'İşlem Logları',      icon: <ScrollText />, permission: 'audit:read' },
      { to: '/sistem-sagligi',label: 'Sistem Sağlığı',     icon: <Activity />,   permission: 'monitoring:read' },
      { to: '/kvkk',          label: 'KVKK & Gizlilik',    icon: <Shield /> },
    ],
  },
];


export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profile    = useAuthStore((s) => s.profile);
  const session    = useAuthStore((s) => s.session);
  const signOut    = useAuthStore((s) => s.signOut);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const navigate   = useNavigate();

  const fullName =
    session?.user.user_metadata?.full_name ??
    profile?.email ??
    session?.user.email ??
    profile?.username ??
    '';

  const closeSidebar = () => setSidebarOpen(false);

  let navItemIndex = 0;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Mobile overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Dark Sidebar ──────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-60 flex-col transition-transform duration-300 ease-in-out',
          // Mobile: slide in/out. Desktop: always visible.
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        style={{ background: 'var(--sidebar)' }}
      >
        {/* Logo */}
        <div
          className="flex h-14 shrink-0 items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <Users className="size-3.5 text-primary-foreground" />
          </div>
          <span
            className="text-sm font-semibold tracking-tight flex-1"
            style={{ color: 'var(--sidebar-foreground-active)' }}
          >
            Personel &amp; İK
          </span>
          {/* Close button — mobile only */}
          <button
            type="button"
            className="rounded-md p-1 transition-colors hover:bg-white/10 md:hidden"
            style={{ color: 'var(--sidebar-muted)' }}
            onClick={closeSidebar}
            aria-label="Menüyü kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (!item.permission) return true;
              if (Array.isArray(item.permission)) return item.permission.some((p) => hasPermission(p));
              return hasPermission(item.permission);
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title}>
                <div
                  className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--sidebar-muted)' }}
                >
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                      const hoverSpec = HOVER_COLORS[navItemIndex % HOVER_COLORS.length];
                      navItemIndex += 1;
                      return item.soon ? (
                      <div
                        key={item.label}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs opacity-40"
                        style={{ color: 'var(--sidebar-foreground)' }}
                      >
                        <span className="size-4 shrink-0">{item.icon}</span>
                        {item.label}
                      </div>
                    ) : (
                      <NavLink
                        key={item.to}
                        to={item.to!}
                        end={item.to === '/'}
                        onClick={closeSidebar}
                        className={({ isActive }) => cn(
                          'nav-item group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                          isActive && 'nav-item-active',
                          isActive ? '' : 'hover:bg-white/5'
                        )}
                        style={({ isActive }) => ({
                          '--nav-color': isActive
                            ? 'var(--sidebar-foreground-active)'
                            : 'var(--sidebar-foreground)',
                          '--nav-hover': hoverSpec.color,
                          '--nav-hover-glow': hoverSpec.glow,
                          background: isActive ? 'var(--sidebar-accent)' : undefined,
                        } as CSSProperties)}
                      >
                        {({ isActive }) => (
                          <>
                            {/* Left accent bar */}
                            <span
                              className={cn(
                                'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full transition-all duration-200',
                                isActive ? 'h-4 opacity-100' : 'h-0 opacity-0',
                              )}
                              style={{ background: isActive ? 'var(--sidebar-indicator)' : undefined }}
                            />
                            <span className="size-4 shrink-0">
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User area */}
        <div
          className="shrink-0 p-3"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          <div
            className="flex items-center gap-2.5 rounded-lg p-2 transition-colors duration-150 cursor-default"
            style={{ background: 'var(--sidebar-accent)' }}
          >
            <Avatar
              src={session?.user.user_metadata?.avatar_url as string | undefined}
              firstName={fullName.split(' ')[0]}
              lastName={fullName.split(' ')[1]}
              className="size-7 text-[10px]"
            />
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-xs font-medium"
                style={{ color: 'var(--sidebar-foreground-active)' }}
              >
                {fullName || 'Kullanıcı'}
              </div>
              <div
                className="truncate text-[10px]"
                style={{ color: 'var(--sidebar-muted)' }}
              >
                {profile?.email ?? '—'}
              </div>
            </div>
            <button
              type="button"
              title="Çıkış"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="rounded-md p-1 transition-colors duration-150 hover:bg-white/10"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="md:ml-60 flex min-h-screen w-full flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              className="rounded-md p-1.5 transition-colors hover:bg-accent md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menüyü aç"
            >
              <Menu className="size-5 text-foreground" />
            </button>
            <span className="font-medium text-sm text-foreground hidden sm:block">Personel ve İnsan Kaynakları</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-5 w-px bg-border" />
            <NotificationDropdown />
            <div className="h-5 w-px bg-border" />
            <Avatar
              src={session?.user.user_metadata?.avatar_url as string | undefined}
              firstName={fullName.split(' ')[0]}
              lastName={fullName.split(' ')[1]}
              className="size-7 cursor-pointer text-[10px]"
            />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <Toaster />
    </div>
  );
}