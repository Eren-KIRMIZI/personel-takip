import { cn, initials } from '@/lib/utils';

/* Deterministic color from name — gives each person a unique color */
const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-sky-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  className?: string;
}

export function Avatar({ src, firstName, lastName, className }: AvatarProps) {
  const name = `${firstName ?? ''}${lastName ?? ''}`;
  const colorClass = getAvatarColor(name || 'U');
  const init = initials(firstName, lastName);

  if (src) {
    return (
      <img
        src={src}
        alt={init}
        className={cn('size-9 rounded-full object-cover ring-2 ring-border', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full',
        'text-xs font-semibold text-white select-none',
        colorClass,
        className,
      )}
    >
      {init}
    </div>
  );
}