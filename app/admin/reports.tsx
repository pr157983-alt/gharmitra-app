import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminColors, downloadCSV } from '@/lib/admin';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState({
    bookings: [] as Record<string, unknown>[],
    customers: [] as Record<string, unknown>[],
    payouts: [] as Record<string, unknown>[],
    technicians: [] as Record<string, unknown>[],
    services: [] as Record<string, unknown>[],
    complaints: [] as Record<string, unknown>[],
  });

  const load = useCallback(async () => {
    const [b, c, p, t, s, k] = await Promise.all([
      supabase.from('bookings').select('*').gte('scheduled_date', from).lte('scheduled_date', to),
      supabase.from('customers').select('*'),
      supabase.from('technician_payouts').select('*'),
      supabase.from('technicians').select('*'),
      supabase.from('services').select('*'),
      supabase.from('complaints').select('*'),
    ]);
    setData({
      bookings: b.data || [],
      customers: c.data || [],
      payouts: p.data || [],
      technicians: t.data || [],
      services: s.data || [],
      complaints: k.data || [],
    });
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const cards = [
    { label: 'Booking Report', rows: data.bookings, file: 'bookings.csv' },
    { label: 'Customer Report', rows: data.customers, file: 'customers.csv' },
    { label: 'Payment Report', rows: data.bookings.filter((r) => String(r.status) === 'completed'), file: 'payments.csv' },
    { label: 'Technician Payout', rows: data.payouts, file: 'payouts.csv' },
    { label: 'Service Report', rows: data.services, file: 'services.csv' },
    { label: 'Complaints', rows: data.complaints, file: 'complaints.csv' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Reports & Downloads</Text>
      <Text style={styles.sub}>Date range bookings ke scheduled_date par lagta hai.</Text>
      <View style={styles.range}>
        <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="From YYYY-MM-DD" />
        <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="To YYYY-MM-DD" />
      </View>
      {loading ? (
        <ActivityIndicator color={AdminColors.purple} />
      ) : (
        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.label} style={styles.card}>
              <Text style={styles.label}>{card.label}</Text>
              <Text style={styles.meta}>{card.rows.length} rows</Text>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => downloadCSV(card.file, card.rows)}
                disabled={card.rows.length === 0}
              >
                <Text style={styles.btnText}>Download Excel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 14 },
  range: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 10, padding: 10, minWidth: 160 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: 220, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: AdminColors.border },
  label: { fontWeight: '800', color: AdminColors.text },
  meta: { color: AdminColors.muted, marginVertical: 8 },
  btn: { backgroundColor: AdminColors.greenSoft, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  btnText: { color: AdminColors.green, fontWeight: '800', fontSize: 12 },
});
