import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase, Booking, Complaint } from '@/lib/supabase';
import { AdminColors } from '@/lib/admin';

type Item = { id: string; title: string; body: string; href: string; when: string; kind: string };

export default function NotificationsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    const bookings = ((b.data as Booking[]) || []).map((x) => ({
      id: `b-${x.id}`,
      title: `New booking · ${x.customer_name}`,
      body: `${x.service_name} · ${x.status} · ${x.scheduled_date}`,
      href: `/admin/bookings?q=${x.id}`,
      when: x.created_at,
      kind: 'booking',
    }));
    const complaints = ((c.data as Complaint[]) || []).map((x) => ({
      id: `c-${x.id}`,
      title: `Complaint · ${x.subject}`,
      body: `${x.customer_name} · ${x.status}`,
      href: '/admin/complaints',
      when: x.created_at,
      kind: 'complaint',
    }));
    setItems([...bookings, ...complaints].sort((a, b2) => +new Date(b2.when) - +new Date(a.when)));
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
      <Text style={styles.h1}>Notifications</Text>
      <Text style={styles.sub}>Latest bookings aur complaints</Text>
      <View style={styles.card}>
        {items.map((n) => (
          <TouchableOpacity key={n.id} style={styles.row} onPress={() => router.push(n.href as any)}>
            <View style={[styles.dot, { backgroundColor: n.kind === 'complaint' ? AdminColors.red : AdminColors.purple }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body}>{n.body}</Text>
            </View>
            <Text style={styles.when}>{new Date(n.when).toLocaleString('en-IN')}</Text>
          </TouchableOpacity>
        ))}
        {items.length === 0 && <Text style={styles.empty}>Koi notification nahi.</Text>}
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
  row: { flexDirection: 'row', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  title: { fontWeight: '700', color: AdminColors.text },
  body: { color: AdminColors.muted, fontSize: 12, marginTop: 2 },
  when: { fontSize: 11, color: AdminColors.muted, width: 140, textAlign: 'right' },
  empty: { padding: 20, color: AdminColors.muted },
});
