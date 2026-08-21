import { Booking } from '@/lib/supabase';

const BLACKLIST_KEY = 'gm_blacklist_phones';

export type Segment = 'blacklist' | 'vip' | 'repeat' | 'high' | 'normal';

export function loadBlacklist(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(BLACKLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveBlacklist(phones: string[]) {
  try {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify([...new Set(phones)]));
  } catch {
    /* ignore */
  }
}

export function isBlacklisted(phone: string, extra: string[] = []) {
  const n = String(phone || '').trim();
  if (!n) return false;
  return extra.includes(n) || loadBlacklist().includes(n);
}

export function segmentFor(orderCount: number, spend: number, blacklisted: boolean): Segment {
  if (blacklisted) return 'blacklist';
  const repeat = orderCount >= 3;
  const high = spend >= 5000;
  if (repeat && high) return 'vip';
  if (repeat) return 'repeat';
  if (high) return 'high';
  return 'normal';
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  blacklist: 'Blacklist',
  vip: 'VIP',
  repeat: 'Repeat',
  high: 'High value',
  normal: 'Normal',
};

export const SEGMENT_COLOR: Record<Segment, { bg: string; fg: string }> = {
  blacklist: { bg: '#FEF2F2', fg: '#DC2626' },
  vip: { bg: '#EDE9FE', fg: '#6D28D9' },
  repeat: { bg: '#EFF6FF', fg: '#2563EB' },
  high: { bg: '#ECFDF5', fg: '#059669' },
  normal: { bg: '#F1F5F9', fg: '#64748B' },
};

export function spendOf(bookings: Booking[]) {
  return bookings
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
}
