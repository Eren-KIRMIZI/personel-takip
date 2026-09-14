import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type ToastType } from './toast';

const ICONS: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertCircle, className: 'text-red-600 dark:text-red-400' },
  info: { icon: Info, className: 'text-sky-600 dark:text-sky-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
};

const RING: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-900/60',
  error: 'border-red-200 dark:border-red-900/60',
  info: 'border-sky-200 dark:border-sky-900/60',
  warning: 'border-amber-200 dark:border-amber-900/60',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, className: iconClassName } = ICONS[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3 text-sm shadow-lg',
              RING[t.type],
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', iconClassName)} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Kapat"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
