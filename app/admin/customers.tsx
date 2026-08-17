import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase, Customer } from '@/lib/supabase';
import { AdminColors } from '@/lib/admin';

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('customer_id, phone'),
    ]);
    setRows((c.data as Customer[]) || []);
    const map: Record<string, number> = {};
    (b.data || []).forEach((x: { customer_id: string | null; phone: string }) => {
      const key = x.customer_id || x.phone;
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    setCounts(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Customers</Text>
      <Text style={styles.sub}>{rows.length} registered customers</Text>
      <View style={styles.card}>
        {rows.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.row}
            onPress={() => router.push(`/admin/bookings?q=${encodeURIComponent(c.phone)}`)}
          >
            <View style={styles.av}>
              <Text style={styles.avText}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>{c.phone}{c.address ? ` · ${c.address}` : ''}</Text>
            </View>
            <Text style={styles.meta}>{counts[c.id] || counts[c.phone] || 0} bookings</Text>
          </TouchableOpacity>
        ))}
        {rows.length === 0 && <Text style={styles.empty}>Abhi registered customer nahi hai. Bookings tab se phone search kar sakte ho.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: AdminColors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: AdminColors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  avText: { color: AdminColors.purple, fontWeight: '800' },
  name: { fontWeight: '700', color: AdminColors.text },
  meta: { color: AdminColors.muted, fontSize: 12, marginTop: 2 },
  empty: { padding: 20, color: AdminColors.muted },
});
