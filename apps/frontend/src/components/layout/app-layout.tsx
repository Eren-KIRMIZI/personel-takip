import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
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
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  QrCode,
  ScrollText,
  ShieldCheck,
  Scale,
  Timer,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import { NotificationDropdown } from './notification-dropdown';

const NAV_SECTIONS: Array<{
  title: string;
  items: Array<{ to?: string; label: string; icon: React.ReactNode; soon?: boolean; permission?: string }>;
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
      { to: '/raporlar',      label: 'Raporlar',          icon: <FileChartColumn />,permission: 'attendance:read' },
      { to: '/vardiya',       label: 'Vardiyalar',        icon: <CalendarRange />, permission: 'shift:read' },
      { to: '/calisma-planlari', label: 'Çalışma Planları', icon: <CalendarDays />, permission: 'shift:read' },
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
      { to: '/mesai/yeni', label: 'Mesai Ekle',   icon: <ClockPlus />,permission: 'overtime:create' },
      { to: '/gorevler',   label: 'Görev',        icon: <Briefcase />,permission: 'task:read' },
      { to: '/zimmet',     label: 'Zimmet',       icon: <Package />,  permission: 'asset:read' },
      { to: '/evrak',      label: 'Evrak',        icon: <FileText />, permission: 'document:read' },
      { to: '/cza-odul',   label: 'Ceza / Ödül', icon: <Scale />,    permission: 'employee-record:read' },
      { to: '/duyurular',  label: 'Duyurular',   icon: <Megaphone />,permission: 'announcement:read' },
    ],
  },
  {
    title: 'Raporlar',
    items: [{ to: '/sistem-raporlari', label: 'Sistem Raporları', icon: <BarChart3 />, permission: 'report:view' }],
  },
  {
    title: 'Yönetim',
    items: [
      { to: '/roller',        label: 'Roller ve Yetkiler', icon: <ShieldCheck />, permission: 'role:read' },
      { to: '/kullanicilar',  label: 'Kullanıcılar',       icon: <UserCog />,     permission: 'user:read' },
      { to: '/islem-loglari', label: 'İşlem Logları',      icon: <ScrollText />,  permission: 'audit:read' },
    ],
  },
];


export function AppLayout() {
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Dark Sidebar ──────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col"
        style={{ background: 'var(--sidebar)' }}
      >
        {/* Logo */}
        <div
          className="flex h-14 shrink-0 items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <Users className="size-3.5 text-white" />
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--sidebar-foreground-active)' }}
          >
            Personel & İK
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission),
            );
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
                  {visibleItems.map((item) =>
                    item.soon ? (
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
                        className={({ isActive }) => cn(
                          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                          isActive ? '' : 'hover:bg-white/5'
                        )}
                        style={({ isActive }) => ({
                          color: isActive
                            ? 'var(--sidebar-foreground-active)'
                            : 'var(--sidebar-foreground)',
                          background: isActive ? 'var(--sidebar-accent)' : undefined,
                        })}
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
                            <span
                              className="size-4 shrink-0 transition-colors"
                              style={{
                                color: isActive
                                  ? 'var(--sidebar-foreground-active)'
                                  : 'var(--sidebar-foreground)',
                              }}
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ),
                  )}
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
      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Personel ve İnsan Kaynakları</span>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}