import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-red-50 text-red-700 border-red-100',
        outline:     'border-border text-foreground',
        success:     'border-transparent bg-emerald-50 text-emerald-700 border-emerald-100',
        warning:     'border-transparent bg-amber-50 text-amber-700 border-amber-100',
        info:        'border-transparent bg-sky-50 text-sky-700 border-sky-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

/* ── Status Badge with animated dot ─────────────────────── */
const STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant']; dot: string }> = {
  ACTIVE:    { label: 'Aktif',      variant: 'success',     dot: 'bg-emerald-500' },
  PASSIVE:   { label: 'Pasif',      variant: 'secondary',   dot: 'bg-gray-400' },
  SUSPENDED: { label: 'Askıda',     variant: 'warning',     dot: 'bg-amber-500' },
  DISABLED:  { label: 'Devre Dışı', variant: 'secondary',   dot: 'bg-gray-400' },
  PENDING:   { label: 'Beklemede',  variant: 'warning',     dot: 'bg-amber-500' },
  APPROVED:  { label: 'Onaylandı',  variant: 'success',     dot: 'bg-emerald-500' },
  REJECTED:  { label: 'Reddedildi', variant: 'destructive', dot: 'bg-red-500' },
  CANCELLED: { label: 'İptal',      variant: 'secondary',   dot: 'bg-gray-400' },
  PAID:      { label: 'Ödendi',     variant: 'success',     dot: 'bg-emerald-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const item = STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const, dot: 'bg-gray-400' };
  const isActive = status === 'ACTIVE' || status === 'APPROVED';
  return (
    <Badge variant={item.variant}>
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          item.dot,
          isActive && 'status-dot-active',
        )}
      />
      {item.label}
    </Badge>
  );
}