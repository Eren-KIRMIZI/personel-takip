import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveTheme, toggleTheme, type Theme } from '@/stores/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleTheme();
        setTheme(next);
      }}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={isDark ? 'Açık tema' : 'Koyu tema'}
      className={cn(
        'group relative flex size-8 items-center justify-center rounded-lg transition-colors duration-200',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className="relative block size-4">
        <Sun
          className={cn(
            'absolute inset-0 size-4 transition-all duration-300',
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 size-4 transition-all duration-300',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
          )}
        />
      </span>
    </button>
  );
}