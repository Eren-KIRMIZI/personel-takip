import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms; 0 = kalıcı (manual kapatma gerekir)
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${Date.now()}-${counter++}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

    // Kritik hatalar (duration 0) otomatik kapanmaz
    const duration = toast.duration ?? (toast.type === 'error' ? 0 : 3000);
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }

    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<Toast, 'id'>) {
  return useToastStore.getState().push(opts);
}
