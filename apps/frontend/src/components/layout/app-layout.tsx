import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
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
import { Badge } from '@/components/ui/badge';

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
      { to: '/personel', label: 'Personel Listesi', icon: <Users /> },
      { to: '/personel/yeni', label: 'Personel Ekle', icon: <UserPlus /> },
    ],
  },
  {
    title: 'Organizasyon',
    items: [{ to: '/organizasyon', label: 'Departman / Birim', icon: <Building2 /> }],
  },
  {
    title: 'İzin ve Puantaj',
    items: [
      { to: '/izin', label: 'İzin Yönetimi', icon: <CalendarDays />, permission: 'leave:read' },
      { to: '/izin/yeni', label: 'Yeni İzin Talebi', icon: <CalendarPlus />, permission: 'leave:create' },
      { to: '/giris-cikis', label: 'Giriş-Çıkış', icon: <Clock />, permission: 'attendance:read' },
      { to: '/giris-cikis/qr', label: 'QR Kodlar', icon: <QrCode />, permission: 'qr:read' },
      { to: '/raporlar', label: 'Raporlar', icon: <FileChartColumn />, permission: 'attendance:read' },
      { to: '/vardiya', label: 'Vardiyalar', icon: <CalendarRange />, permission: 'shift:read' },
      { label: 'Çalışma Planları', icon: <CalendarDays />, soon: true },
    ],
  },
  {
    title: 'Ödeme',
    items: [
      { to: '/maas', label: 'Maaş / Bordro', icon: <Banknote />, permission: 'payroll:read' },
      { to: '/avans', label: 'Avanslar', icon: <CreditCard />, permission: 'advance:read' },
      { label: 'Prim', icon: <Banknote />, soon: true },
    ],
  },
  {
    title: 'İş Süreçleri',
    items: [
      { to: '/mesai', label: 'Mesai', icon: <Timer />, permission: 'overtime:read' },
      { to: '/mesai/yeni', label: 'Mesai Ekle', icon: <ClockPlus />, permission: 'overtime:create' },
      { label: 'Görev', icon: <Briefcase />, soon: true },
      { label: 'Zimmet', icon: <Package />, soon: true },
      { label: 'Evrak', icon: <FileText />, soon: true },
      { to: '/cza-odul', label: 'Ceza / Ödül', icon: <Scale />, permission: 'employee-record:read' },
      { label: 'Duyurular', icon: <Megaphone />, soon: true },
    ],
  },
  {
    title: 'Raporlar',
    items: [{ label: 'Raporlama', icon: <BarChart3 />, soon: true }],
  },
  {
    title: 'Yönetim',
    items: [
      { to: '/roller', label: 'Roller ve Yetkiler', icon: <ShieldCheck /> },
      { to: '/kullanicilar', label: 'Kullanıcılar', icon: <UserCog /> },
      { label: 'İşlem Logları', icon: <ScrollText />, soon: true },
    ],
  },
];

export function AppLayout() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const navigate = useNavigate();

  const fullName =
    session?.user.user_metadata?.full_name ??
    profile?.email ??
    session?.user.email ??
    profile?.username ??
    '';

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Users className="size-4" />
          </div>
          <span className="font-semibold">Personel ve İK</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items
                  .filter((item) => !item.permission || hasPermission(item.permission))
                  .map((item) =>
                  item.soon ? (
                    <div
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                      title="Yakında"
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        yakında
                      </Badge>
                    </div>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to!}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-foreground/80 hover:bg-accent/60',
                        )
                      }
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Avatar src={session?.user.user_metadata?.avatar_url as string | undefined} className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{fullName || 'Kullanıcı'}</div>
              <div className="truncate text-xs text-muted-foreground">{profile?.email ?? '—'}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Çıkış"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        <header className="flex h-14 items-center gap-2 border-b bg-card px-6">
          <ChevronRight className="size-4 text-muted-foreground" />
          <span className="text-sm">Personel ve İnsan Kaynakları Modülü</span>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}