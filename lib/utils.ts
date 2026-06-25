import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTH(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

export function formatTimeTH(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
    hour12: false,
  });
}

export function getDateTimeTH(dateStr: string): Date {
  const date = new Date(dateStr);
  const utcOffset = date.getTimezoneOffset();
  const bangkokOffset = -420; // GMT+7
  const diff = bangkokOffset - utcOffset;
  return new Date(date.getTime() + diff * 60000);
}

export function censorEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 8))}@${domain}`;
}

export function getCountdownParts(kickoffStr: string): { h: number; m: number; s: number; total: number } {
  const now = new Date().getTime();
  const kickoff = new Date(kickoffStr).getTime();
  const diff = kickoff - now;
  if (diff <= 0) return { h: 0, m: 0, s: 0, total: 0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, total: diff };
}
