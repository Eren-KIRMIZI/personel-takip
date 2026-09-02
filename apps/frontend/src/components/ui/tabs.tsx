import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: Array<{ value: string; label: string; content?: React.ReactNode }>;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, defaultValue, onValueChange, className }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0]?.value ?? '');
  const active = value ?? internal;

  const select = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const activeTab = tabs.find((t) => t.value === active);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => select(tab.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none',
              active === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content ?? null}
    </div>
  );
}