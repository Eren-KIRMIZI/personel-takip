import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  className?: string;
}

export function Avatar({ src, firstName, lastName, className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={initials(firstName, lastName)} className={cn('size-9 rounded-full object-cover', className)} />;
  }
  return (
    <div
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground',
        className,
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}