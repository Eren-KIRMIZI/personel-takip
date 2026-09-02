import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('tr-TR');
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('tr-TR');
}

export function formatError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? 'Bilinmeyen hata');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
}