import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2 } from 'lucide-react';
import { notificationApi } from '@/features/bildirim/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications-latest'],
    queryFn: () => notificationApi.list(1, 10),
    refetchInterval: 30000, // Her 30 saniyede bir yeni bildirimleri kontrol et
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-latest'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-latest'] }),
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md border bg-card p-1 shadow-lg ring-1 ring-black/5 z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-semibold text-sm">Bildirimler</span>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-1 text-xs" 
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Tümünü Oku
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-1">
            {data && data.items.length > 0 ? (
              <div className="space-y-1">
                {data.items.map((n) => (
                  <div
                    key={n.id}
                    className={`flex flex-col gap-1 rounded-sm px-3 py-2 text-sm transition-colors ${
                      !n.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span>
                      {!n.isRead && (
                        <button 
                          onClick={() => markRead.mutate(n.id)}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title="Okundu olarak işaretle"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {n.body && <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                    <span className="text-[10px] text-muted-foreground/60">{formatDateTime(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Yeni bildiriminiz yok.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
