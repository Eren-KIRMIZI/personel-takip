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
      <div className="flex flex-wrap gap-6 border-b border-border/80 px-1 mb-5">
        {tabs.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => select(tab.value)}
              className={cn(
                'relative pb-3 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-[-1px] left-0 h-0.5 w-full bg-primary rounded-t-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
      <div className="animate-fade-in">
        {activeTab?.content ?? null}
      </div>
    </div>
  );
}