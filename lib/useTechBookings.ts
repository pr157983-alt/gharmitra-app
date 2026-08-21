import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase, Booking } from '@/lib/supabase';
import { parseJobMeta } from '@/lib/jobMeta';
import { readTechSession } from '@/lib/techSession';

function rejectedIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem('tech_rejected_jobs') || '[]');
  } catch {
    return [];
  }
}

export function markJobRejected(id: string) {
  try {
    const ids = [...new Set([...rejectedIds(), id])];
    sessionStorage.setItem('tech_rejected_jobs', JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function useTechBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pool, setPool] = useState<Booking[]>([]);
  const [serviceRatings, setServiceRatings] = useState<Record<string, { rating: number; reviews: number }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { id } = readTechSession();
    if (!id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: mine, error: e1 }, { data: open, error: e2 }] = await Promise.all([
      supabase.from('bookings').select('*').eq('technician_id', id).order('scheduled_date', { ascending: true }),
      supabase.from('bookings').select('*').is('technician_id', null).eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    if (e1 || e2) Alert.alert('Error', 'Jobs load nahi ho payi. Refresh karein.');
    const mineRows = mine || [];
    const openRows = open || [];
    setBookings(mineRows);
    setPool(openRows);
    const serviceIds = [...new Set([...mineRows, ...openRows].map((b) => b.service_id).filter(Boolean))];
    if (serviceIds.length) {
      const { data: svcs } = await supabase.from('services').select('id, rating, reviews_count').in('id', serviceIds);
      const map: Record<string, { rating: number; reviews: number }> = {};
      (svcs || []).forEach((s: { id: string; rating: number; reviews_count: number }) => {
        map[s.id] = { rating: Number(s.rating || 0), reviews: Number(s.reviews_count || 0) };
      });
      setServiceRatings(map);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const { id } = readTechSession();
    if (!id) return;
    const channel = supabase
      .channel(`tech_jobs_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const skip = rejectedIds();
  const minePending = bookings.filter((b) => b.status === 'pending' && !skip.includes(b.id));
  const newJobs = [...pool, ...minePending].filter((b) => !skip.includes(b.id));
  const active = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  const completed = bookings.filter((b) => b.status === 'completed');
  const todayCompleted = completed.filter((b) => (b.scheduled_date || '').slice(0, 10) === todayIso() || (b.created_at || '').slice(0, 10) === todayIso());
  const todayEarning = todayCompleted.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const current = active[0] || null;
  const currentStage = current ? parseJobMeta(current.notes).meta.tech_stage || (current.status === 'in_progress' ? 'started' : 'accepted') : null;
  const rated = completed
    .map((b) => Number(parseJobMeta(b.notes).meta.customer_rating || 0))
    .filter((n) => n > 0);
  const techRating = rated.length ? Math.round((rated.reduce((s, n) => s + n, 0) / rated.length) * 10) / 10 : 0;

  return {
    bookings,
    newJobs,
    active,
    completed,
    current,
    currentStage,
    todayEarning,
    jobsDoneToday: todayCompleted.length,
    serviceRatings,
    techRating,
    techRatingCount: rated.length,
    loading,
    refreshing,
    onRefresh,
    reload: load,
  };
}
