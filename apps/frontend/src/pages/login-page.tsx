import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Users, Lock, Mail, Eye, EyeOff, Check, ArrowRight,
  CalendarDays, QrCode, Wallet, Clock, ShieldCheck, FileText,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { prefetchAllCoreData } from '@/lib/warm-up-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25', className)}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
        <path d="M4.5 20.5V6.6a1.6 1.6 0 0 1 1.6-1.6h7.3v15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.4 20.5V9.6h4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.4 20.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4.5 9.6h7.3M4.5 13.1h7.3M4.5 16.6h7.3" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
        <circle cx="10.6" cy="6.9" r="1.6" fill="#BFDBFE" />
        <path d="M8.8 12.4a1.8 1.8 0 0 1 3.6 0" fill="#BFDBFE" />
        <path d="M13.4 7.6c.9.3 1.5 1 2 1.9l1.8 1.1" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="18.6" cy="11.4" r="1.25" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

const FEATURES: { icon: typeof Users; label: string }[] = [
  { icon: Users, label: 'Personel Yönetimi' },
  { icon: CalendarDays, label: 'İzin ve Puantaj' },
  { icon: Clock, label: 'Mesai ve Vardiya' },
  { icon: Wallet, label: 'Maaş ve Ödemeler' },
  { icon: QrCode, label: 'Görev ve Zimmet' },
  { icon: Check, label: 'Raporlama' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const session     = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const signIn      = useAuthStore((s) => s.signIn);
  const navigate    = useNavigate();

  // Supabase baglantisini ogretme istegi (connection pool isi)
  useEffect(() => {
    supabase.from('departments').select('id').limit(1).then(() => {});
  }, []);

  if (initialized && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password, remember);
      void prefetchAllCoreData();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giris basarisiz.');
      setLoading(false);
    }
  };

  const onForgot = async (event: FormEvent) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setResetLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail((forgotEmail || email).trim(), {
        redirectTo: window.location.origin,
      });
      if (resetErr) {
        throw new Error(resetErr.message);
      }
      setResetMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Sıfırlama bağlantısı gönderilemedi.');
    } finally {
      setResetLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'forgot') => {
    setMode(next);
    setError(null);
    setResetError(null);
    setResetMessage(null);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sol: kurumsal marka paneli */}
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:w-[46%] xl:w-[42%]">
        {/* Arka plan dokuları */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-32 size-[30rem] rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 size-[26rem] rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#94A3B8_1px,transparent_1px),linear-gradient(to_bottom,#94A3B8_1px,transparent_1px)] [background-size:44px_44px]" />
        {/* Soluk dashboard kalıntıları */}
        <div className="pointer-events-none absolute inset-0">
          <CalendarDays className="absolute left-[8%] top-[30%] size-24 rotate-[-8deg] text-primary opacity-[0.07]" />
          <Users className="absolute left-[55%] top-[12%] size-28 rotate-6 text-primary opacity-[0.07]" />
          <QrCode className="absolute left-[70%] top-[55%] size-24 text-primary opacity-[0.06]" />
          <Clock className="absolute left-[12%] top-[68%] size-20 text-primary opacity-[0.06]" />
        </div>

        <div className="relative z-10 flex w-full flex-col justify-between gap-12 p-12">
          {/* Marka */}
          <div className="flex items-center gap-3">
            <LogoMark className="shadow-none shadow-primary/30" />
            <div>
              <p className="font-display text-xl font-bold tracking-tight">Personel Takip Sistemi</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/70">
                Yenişehir Belediyesi
              </p>
            </div>
          </div>

          {/* Değer önerisi */}
          <div className="max-w-md space-y-8">
            <div className="space-y-3">
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
                Tek platform. Tüm personel süreçleri.
              </h2>
              <p className="text-sm leading-relaxed text-blue-100/70">
                Personel yönetimi, puantaj, maaş, mesai, görev ve zimmet süreçlerinizi tek merkezden güvenle yönetin.
              </p>
            </div>

            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-blue-50/90">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/10">
                    <f.icon className="size-3.5 text-blue-200" />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Alt bilgi */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-blue-100/60">
              <p>© 2026 Personel Takip Sistemi</p>
              <button
                type="button"
                onClick={() => setKvkkOpen(true)}
                className="flex items-center gap-1 text-blue-200/80 hover:text-white underline underline-offset-2 transition-colors"
              >
                <ShieldCheck className="size-3.5" />
                KVKK Aydınlatma
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-100/40">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Güvenli kimlik doğrulama
              </span>
              <span>2026/347 & 2026/921 Uyumlu</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Sağ: giriş formu */}
      <main className="flex flex-1 items-center justify-center bg-muted/10 px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobil marka */}
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <LogoMark />
            <div>
              <p className="font-display text-xl font-bold tracking-tight text-foreground">Personel Takip Sistemi</p>
              <p className="text-xs text-muted-foreground">Yenişehir Belediyesi</p>
            </div>
          </div>

          {/* Başlık */}
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {mode === 'forgot' ? 'Şifrenizi mi unuttunuz?' : 'Hoş Geldiniz'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'forgot'
                ? 'Sıfırlama bağlantısı için e-posta adresinizi girin.'
                : 'Kurum hesabınızla sisteme giriş yapın.'}
            </p>
          </div>

          {mode === 'forgot' ? (
            <form onSubmit={onForgot} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-sm font-medium">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="ornek@kurum.gov.tr"
                    autoComplete="email"
                    className="pl-9"
                    value={forgotEmail || email}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {resetMessage && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {resetMessage}
                </div>
              )}
              {resetError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                  {resetError}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={resetLoading}>
                {resetLoading ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
              </Button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Giriş ekranına dön
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@kurum.gov.tr"
                    autoComplete="username"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  Beni hatırla
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Şifremi unuttum
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Kimlik Doğrulanıyor…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Giriş Yap
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
            <p>© 2026 Personel Takip Sistemi · Kurum içi kullanım içindir</p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
              <button
                type="button"
                onClick={() => setKvkkOpen(true)}
                className="font-medium text-primary hover:underline underline-offset-2 flex items-center gap-1"
              >
                <ShieldCheck className="size-3.5" />
                KVKK Aydınlatma Metni
              </button>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Biyometrik Veri İşlenmez (2026/921)</span>
              <span>·</span>
              <span>SLA: 30 Gün</span>
            </div>
          </div>
        </div>
      </main>

      {/* KVKK 2026 Aydınlatma Dialog */}
      <Dialog
        open={kvkkOpen}
        onClose={() => setKvkkOpen(false)}
        title="KVKK Çalışan Aydınlatma Metni"
        description="6698 Sayılı Kanun ve 2026 Güncel Kurul İlke Kararları Uyarınca Bilgilendirme"
        footer={
          <Button onClick={() => setKvkkOpen(false)} className="px-6">
            Anladım, Kapat
          </Button>
        }
      >
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-xs leading-relaxed text-foreground/90">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              2026/347 İlke Kararı Güvencesi:
            </p>
            <p className="mt-1 text-[11px]">
              Bu aydınlatma metni bilgilendirme amaçlıdır. Sisteme girişiniz zorunlu bir açık rıza onay kutusuna (checkbox) bağlanmamıştır.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-foreground">1. Veri Sorumlusu</h4>
            <p className="mt-1 text-muted-foreground">
              6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, çalışanlarımızın kişisel verileri veri sorumlusu sıfatıyla Kurum İnsan Kaynakları Yönetimi tarafından işlenmektedir.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-foreground">2. İşlenen Veri Kategorileri</h4>
            <ul className="mt-1.5 list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Kimlik & Özlük:</strong> Ad, soyad, T.C. kimlik numarası, sicil no, departman, unvan, işe giriş tarihi.</li>
              <li><strong>İletişim:</strong> Kurumsal ve şahsi e-posta, telefon numarası.</li>
              <li><strong>Puantaj & Giriş-Çıkış:</strong> QR kodlu PDKS hareket kayıtları, vardiya ve fazla mesai saatleri.</li>
              <li><strong>İzin & Rapor:</strong> Yıllık izin, mazeret izni ve SGK istirahat raporları.</li>
              <li><strong>Finans & Bordro:</strong> IBAN numarası, brüt/net ücret ve yasal kesintiler.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-900 dark:text-blue-200">
            <h4 className="font-bold text-xs flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Biyometrik Veri İşlenmez (2026/921 Sayılı İlke Kararı)
            </h4>
            <p className="mt-1 text-[11px] leading-normal">
              Mesai takibinde parmak izi, yüz tanıma veya avuç içi taraması gibi biyometrik yöntemler <strong>kesinlikle kullanılmamaktadır</strong>. Giriş-çıkışlar dinamik QR kod ve kart/şifre mekanizmalarıyla ölçülmektedir.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-foreground">3. Veri İşlemenin Hukuki Sebepleri</h4>
            <p className="mt-1 text-muted-foreground">
              Verileriniz, 4857 sayılı İş Kanunu, 5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu ve 6698 sayılı KVKK m. 5/2-c (sözleşmenin ifası), m. 5/2-ç (hukuki yükümlülüğün yerine getirilmesi) ve m. 5/2-e (bir hakkın tesisi ve korunması) maddeleri kapsamında işlenmektedir.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-foreground">4. İlgili Kişi Hakları & Başvuru (m. 11)</h4>
            <p className="mt-1 text-muted-foreground">
              Veri sahibi olarak sistemde kayıtlı kişisel verilerinizi öğrenme, düzeltme, aktarılan üçüncü kişileri bilme ve silinmesini talep etme hakkınız mevcuttur. Sisteme giriş yaptıktan sonra sol menüdeki <strong>"KVKK & Gizlilik"</strong> merkezinden verilerinizi JSON formatında indirebilir veya resmi başvuru oluşturabilirsiniz. Başvurularınız yasal <strong>30 günlük süre</strong> içinde sonuçlandırılır.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}