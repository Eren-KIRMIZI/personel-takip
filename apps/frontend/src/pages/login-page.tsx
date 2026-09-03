import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Users, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session     = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const signIn      = useAuthStore((s) => s.signIn);
  const navigate    = useNavigate();

  // Supabase warm-up: login ekranı açılır açılmaz DB bağlantısı başlatılır.
  // Kullanıcı şifresini yazarken DB zaten uyanmış olur.
  useEffect(() => {
    supabase.from('departments').select('id').limit(1).then(() => {
      // sonucu umursamıyoruz — amaç yalnızca bağlantı kurmak
    });
  }, []);

  if (initialized && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/20">
            <Users className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Personel ve İK
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kurum hesabınızla sisteme giriş yapın
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-[var(--shadow-md)]">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Giriş yapılıyor…
                </span>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}