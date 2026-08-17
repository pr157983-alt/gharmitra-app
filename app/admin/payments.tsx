import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase, Booking } from '@/lib/supabase';
import { AdminColors, formatINR } from '@/lib/admin';

export default function AdminPaymentsScreen() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    setRows((data as Booking[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completed = rows.filter((b) => b.status === 'completed');
  const pending = rows.filter((b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress');
  const total = completed.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const pendingAmt = pending.reduce((s, b) => s + Number(b.total_amount || 0), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Payments</Text>
      <Text style={styles.sub}>Cash collections from completed jobs</Text>
      <View style={styles.kpis}>
        <View style={styles.kpi}>
          <Text style={styles.kpiL}>Collected</Text>
          <Text style={styles.kpiV}>{formatINR(total)}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiL}>Pending collection</Text>
          <Text style={styles.kpiV}>{formatINR(pendingAmt)}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiL}>Paid jobs</Text>
          <Text style={styles.kpiV}>{completed.length}</Text>
        </View>
      </View>
      <View style={styles.card}>
        {completed.map((b) => (
          <TouchableOpacity key={b.id} style={styles.row} onPress={() => router.push(`/admin/bookings?q=${b.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{b.customer_name}</Text>
              <Text style={styles.meta}>{b.service_name} · {b.scheduled_date} · Cash</Text>
            </View>
            <Text style={styles.amt}>{formatINR(Number(b.total_amount))}</Text>
          </TouchableOpacity>
        ))}
        {completed.length === 0 && <Text style={styles.empty}>Completed payments abhi nahi hain.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 14 },
  kpis: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: AdminColors.border },
  kpiL: { color: AdminColors.muted, fontSize: 12, fontWeight: '600' },
  kpiV: { fontSize: 20, fontWeight: '800', marginTop: 6, color: AdminColors.text },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: AdminColors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  name: { fontWeight: '700', color: AdminColors.text },
  meta: { color: AdminColors.muted, fontSize: 12, marginTop: 2 },
  amt: { fontWeight: '800', color: AdminColors.green },
  empty: { padding: 20, color: AdminColors.muted },
});
