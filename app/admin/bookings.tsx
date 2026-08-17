import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase, Booking, Technician } from '@/lib/supabase';
import { AdminColors } from '@/lib/admin';
import { BookingTable } from '@/components/admin/BookingTable';

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export default function AdminBookingsScreen() {
  const params = useLocalSearchParams<{ status?: string; q?: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(params.status || null);
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [assignFor, setAssignFor] = useState<Booking | null>(null);
  const [q] = useState(params.q || '');
  const [date, setDate] = useState('');

  useEffect(() => {
    try {
      setRole((sessionStorage.getItem('admin_role') as 'super' | 'viewer') || 'super');
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (filter) query = query.eq('status', filter);
    const [b, t] = await Promise.all([query, supabase.from('technicians').select('*')]);
    let rows = (b.data as Booking[]) || [];
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter(
        (x) =>
          x.id.toLowerCase().includes(s) ||
          x.customer_name.toLowerCase().includes(s) ||
          x.phone.includes(s) ||
          x.service_name.toLowerCase().includes(s) ||
          (x.address || '').toLowerCase().includes(s)
      );
    }
    if (date) rows = rows.filter((x) => x.scheduled_date === date);
    setBookings(rows);
    setTechnicians((t.data as Technician[]) || []);
    setLoading(false);
  }, [filter, q, date]);

  useEffect(() => {
    setFilter(params.status || null);
  }, [params.status]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    load();
  };

  const assign = async (bookingId: string, techId: string | null) => {
    await supabase
      .from('bookings')
      .update({ technician_id: techId, assigned_at: techId ? new Date().toISOString() : null })
      .eq('id', bookingId);
    setAssignFor(null);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} horizontal={false}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.h1}>Recent booking / orders</Text>
          <Text style={styles.sub}>
            {bookings.length} records{filter ? ` · ${filter}` : ''}
            {q ? ` · search "${q}"` : ''}
          </Text>
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateLabel}>Date</Text>
          <Text style={styles.dateValue}>{date || new Date().toISOString().slice(0, 10)}</Text>
          <TouchableOpacity onPress={() => setDate(date ? '' : new Date().toISOString().slice(0, 10))}>
            <Text style={styles.link}>{date ? 'Show all' : 'Today'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={[styles.chip, !filter && styles.chipOn]} onPress={() => setFilter(null)}>
          <Text style={[styles.chipText, !filter && styles.chipTextOn]}>All</Text>
        </TouchableOpacity>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} style={[styles.chip, filter === s && styles.chipOn]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextOn]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.card}>
          <BookingTable
            bookings={bookings}
            technicians={technicians}
            role={role}
            onAssign={role === 'super' ? setAssignFor : undefined}
            onStatus={role === 'super' ? updateStatus : undefined}
          />
          {bookings.length === 0 && <Text style={styles.empty}>Is filter pe booking nahi mili.</Text>}
        </View>
      </ScrollView>

      <Modal visible={!!assignFor} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAssignFor(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.h1}>Assign technician</Text>
            <TouchableOpacity style={styles.techItem} onPress={() => assignFor && assign(assignFor.id, null)}>
              <Text>Unassign</Text>
            </TouchableOpacity>
            {technicians
              .filter((t) => t.is_active)
              .map((t) => (
                <TouchableOpacity key={t.id} style={styles.techItem} onPress={() => assignFor && assign(assignFor.id, t.id)}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.meta}>{t.skills || t.phone}</Text>
                </TouchableOpacity>
              ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4 },
  dateChip: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: AdminColors.border, minWidth: 140 },
  dateLabel: { fontSize: 10, fontWeight: '700', color: AdminColors.muted },
  dateValue: { fontWeight: '700', color: AdminColors.text, marginTop: 2 },
  link: { color: AdminColors.purple, fontWeight: '700', fontSize: 12, marginTop: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: AdminColors.purple, borderColor: AdminColors.purple },
  chipText: { fontSize: 12, fontWeight: '700', color: AdminColors.text, textTransform: 'capitalize' },
  chipTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: AdminColors.border, padding: 14 },
  empty: { padding: 20, color: AdminColors.muted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: 480 },
  techItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  name: { fontSize: 13, fontWeight: '700', color: AdminColors.text },
  meta: { fontSize: 11, color: AdminColors.muted, marginTop: 2 },
});
