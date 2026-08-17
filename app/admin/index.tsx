import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase, Booking, Technician } from '@/lib/supabase';
import { BookingTable } from '@/components/admin/BookingTable';
import { AdminColors, formatINR } from '@/lib/admin';

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('technicians').select('*').order('name'),
      ]);
      setBookings((b.data as Booking[]) || []);
      setTechnicians((t.data as Technician[]) || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.status === 'completed');
    return {
      revenue: completed.reduce((s, b) => s + Number(b.total_amount || 0), 0),
      bookings: bookings.length,
      staff: technicians.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      process: bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress').length,
      completed: completed.length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
  }, [bookings, technicians]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={AdminColors.purple} size="large" />
      </View>
    );
  }

  const actionCells = [
    { label: 'Pe', full: 'Pending', value: stats.pending, href: '/admin/bookings?status=pending', color: AdminColors.orange },
    { label: 'Pr', full: 'Process', value: stats.process, href: '/admin/bookings?status=in_progress', color: AdminColors.blue },
    { label: 'Com', full: 'Complete', value: stats.completed, href: '/admin/bookings?status=completed', color: AdminColors.green },
    { label: 'Can', full: 'Cancel', value: stats.cancelled, href: '/admin/bookings?status=cancelled', color: AdminColors.red },
  ];

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.statRow}>
        <TouchableOpacity style={[styles.statBox, { backgroundColor: AdminColors.purpleSoft, borderColor: '#DDD6FE' }]} onPress={() => router.push('/admin/payments')} activeOpacity={0.85}>
          <Text style={[styles.statLabel, { color: AdminColors.purple }]}>Total Revenue</Text>
          <Text style={[styles.statValue, { color: AdminColors.purpleDark }]}>{formatINR(stats.revenue)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, { backgroundColor: AdminColors.greenSoft, borderColor: '#A7F3D0' }]} onPress={() => router.push('/admin/bookings')} activeOpacity={0.85}>
          <Text style={[styles.statLabel, { color: AdminColors.green }]}>Total booking</Text>
          <Text style={[styles.statValue, { color: AdminColors.green }]}>{stats.bookings}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, { backgroundColor: AdminColors.blueSoft, borderColor: '#BFDBFE' }]} onPress={() => router.push('/admin/technicians')} activeOpacity={0.85}>
          <Text style={[styles.statLabel, { color: AdminColors.blue }]}>Staff</Text>
          <Text style={[styles.statValue, { color: AdminColors.blue }]}>{stats.staff}</Text>
        </TouchableOpacity>
        <View style={[styles.actionBox, { backgroundColor: AdminColors.orangeSoft, borderColor: '#FDE68A' }]}>
          <Text style={[styles.statLabel, { color: AdminColors.orange }]}>Action</Text>
          <View style={styles.actionRow}>
            {actionCells.map((a) => (
              <TouchableOpacity key={a.label} style={styles.actionCell} onPress={() => router.push(a.href as any)} activeOpacity={0.8}>
                <Text style={[styles.actionHead, { color: a.color }]}>{a.label}</Text>
                <Text style={[styles.actionNum, { color: a.color }]}>{a.value}</Text>
                <Text style={styles.actionFull}>{a.full}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.billBox}
          onPress={() => bookings[0] && router.push(`/admin/bill/${bookings[0].id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.billLabel}>Bill Generate</Text>
          <Text style={styles.billHint}>Latest booking invoice</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Recent booking / orders</Text>
          <TouchableOpacity onPress={() => router.push('/admin/bookings')}>
            <Text style={styles.link}>View all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <BookingTable bookings={bookings} technicians={technicians} role="viewer" />
        </ScrollView>
        {bookings.length === 0 && <Text style={styles.empty}>Abhi koi booking nahi hai.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 18, gap: 16 },
  statRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  statBox: {
    flex: 0.85,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    minHeight: 78,
  },
  statLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  actionBox: {
    flex: 1.35,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  billBox: {
    flex: 0.95,
    backgroundColor: AdminColors.purple,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 78,
  },
  billLabel: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  billHint: { color: '#EDE9FE', fontSize: 10, marginTop: 4, textAlign: 'center' },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  actionCell: { flex: 1, alignItems: 'center' },
  actionHead: { fontSize: 11, fontWeight: '800', color: AdminColors.muted },
  actionNum: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  actionFull: { fontSize: 9, color: AdminColors.muted, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AdminColors.border, flex: 1 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: AdminColors.text },
  link: { color: AdminColors.purple, fontWeight: '700', fontSize: 12 },
  empty: { color: AdminColors.muted, paddingVertical: 16, fontSize: 13 },
});
