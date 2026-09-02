import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        info: 'border-transparent bg-sky-100 text-sky-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    ACTIVE: { label: 'Aktif', variant: 'success' },
    PASSIVE: { label: 'Pasif', variant: 'secondary' },
    SUSPENDED: { label: 'Askıda', variant: 'warning' },
    DISABLED: { label: 'Pasif', variant: 'secondary' },
    PENDING: { label: 'Beklemede', variant: 'warning' },
    APPROVED: { label: 'Onaylandı', variant: 'success' },
    REJECTED: { label: 'Reddedildi', variant: 'destructive' },
    CANCELLED: { label: 'İptal', variant: 'secondary' },
  };
  const item = map[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}