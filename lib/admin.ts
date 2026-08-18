export const AdminColors = {
  purple: '#6D28D9',
  purpleDark: '#5B21B6',
  purpleSoft: '#EDE9FE',
  purpleMid: '#7C3AED',
  bg: '#F4F6FB',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  green: '#10B981',
  greenSoft: '#ECFDF5',
  orange: '#F59E0B',
  orangeSoft: '#FFFBEB',
  blue: '#3B82F6',
  blueSoft: '#EFF6FF',
  red: '#EF4444',
  redSoft: '#FEF2F2',
  dark: '#111827',
};

export function getAdminRole(): 'super' | 'viewer' | null {
  try {
    if (typeof window === 'undefined') return null;
    if (sessionStorage.getItem('admin_logged_in') !== 'true') return null;
    return (sessionStorage.getItem('admin_role') as 'super' | 'viewer') || 'super';
  } catch {
    return null;
  }
}

export function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function weekBounds() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return { now, weekAgo, twoWeeksAgo };
}

export function pctDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (typeof document === 'undefined') return;
  if (!rows.length) {
    const blob = new Blob(['No rows'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function statusColor(status: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    pending: { bg: '#FFFBEB', fg: '#D97706' },
    confirmed: { bg: '#EFF6FF', fg: '#2563EB' },
    in_progress: { bg: '#EDE9FE', fg: '#6D28D9' },
    completed: { bg: '#ECFDF5', fg: '#059669' },
    cancelled: { bg: '#FEF2F2', fg: '#DC2626' },
    paid: { bg: '#ECFDF5', fg: '#059669' },
    open: { bg: '#FFFBEB', fg: '#D97706' },
    resolved: { bg: '#ECFDF5', fg: '#059669' },
    closed: { bg: '#F1F5F9', fg: '#64748B' },
  };
  return map[status] || { bg: '#F1F5F9', fg: '#475569' };
}

export function shortId(id: string) {
  return `#${(id || '').slice(0, 8).toUpperCase()}`;
}
