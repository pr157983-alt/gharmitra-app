import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase, Booking } from '@/lib/supabase';
import { parseJobMeta } from '@/lib/jobMeta';
import { readTechSession } from '@/lib/techSession';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function useTechBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pool, setPool] = useState<Booking[]>([]);
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
    setBookings(mine || []);
    setPool(open || []);
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

  const minePending = bookings.filter((b) => b.status === 'pending');
  const newJobs = [...pool, ...minePending];
  const active = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  const completed = bookings.filter((b) => b.status === 'completed');
  const todayCompleted = completed.filter((b) => (b.scheduled_date || '').slice(0, 10) === todayIso() || (b.created_at || '').slice(0, 10) === todayIso());
  const todayEarning = todayCompleted.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const current = active[0] || null;
  const currentStage = current ? parseJobMeta(current.notes).meta.tech_stage || (current.status === 'in_progress' ? 'started' : 'accepted') : null;

  return {
    bookings,
    newJobs,
    active,
    completed,
    current,
    currentStage,
    todayEarning,
    jobsDoneToday: todayCompleted.length,
    loading,
    refreshing,
    onRefresh,
    reload: load,
  };
}
