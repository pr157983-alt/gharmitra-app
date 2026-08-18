import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { supabase, Booking, Customer } from '@/lib/supabase';
import { AdminColors, formatINR } from '@/lib/admin';
import {
  SEGMENT_COLOR,
  SEGMENT_LABEL,
  Segment,
  isBlacklisted,
  loadBlacklist,
  segmentFor,
  spendOf,
} from '@/lib/customerSegment';

type Row = {
  key: string;
  name: string;
  phone: string;
  address: string | null;
  orders: number;
  spend: number;
  segment: Segment;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Segment | 'all'>('all');
  const [q, setQ] = useState('');
  const [blacklist, setBlacklist] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*'),
    ]);
    setCustomers((c.data as Customer[]) || []);
    setBookings((b.data as Booking[]) || []);
    setBlacklist(loadBlacklist());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const phones = new Set<string>();
    customers.forEach((c) => phones.add(c.phone.trim()));
    bookings.forEach((b) => b.phone && phones.add(b.phone.trim()));

    return [...phones].filter(Boolean).map((phone) => {
      const c = customers.find((x) => x.phone.trim() === phone);
      const list = bookings.filter((b) => (b.phone || '').trim() === phone);
      const orders = list.length;
      const spend = spendOf(list);
      const bl = isBlacklisted(phone, blacklist);
      return {
        key: phone,
        name: c?.name || list[0]?.customer_name || 'Guest',
        phone,
        address: c?.address || list[0]?.address || null,
        orders,
        spend,
        segment: segmentFor(orders, spend, bl),
      } as Row;
    }).sort((a, b) => b.spend - a.spend);
  }, [customers, bookings, blacklist]);

  const visible = rows.filter((r) => {
    if (filter !== 'all' && r.segment !== filter) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return r.name.toLowerCase().includes(s) || r.phone.includes(s);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  const chips: { id: Segment | 'all'; label: string }[] = [
    { id: 'all', label: `All (${rows.length})` },
    { id: 'vip', label: 'VIP' },
    { id: 'repeat', label: 'Repeat' },
    { id: 'high', label: 'High value' },
    { id: 'normal', label: 'Normal' },
    { id: 'blacklist', label: 'Blacklist' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Customers</Text>
      <Text style={styles.sub}>List, spend, tags — click karke history aur complaints dekho</Text>
      <TextInput style={styles.search} placeholder="Search name or phone" value={q} onChangeText={setQ} />
      <View style={styles.filters}>
        {chips.map((c) => (
          <TouchableOpacity key={c.id} style={[styles.chip, filter === c.id && styles.chipOn]} onPress={() => setFilter(c.id)}>
            <Text style={[styles.chipText, filter === c.id && styles.chipTextOn]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.card}>
        {visible.map((r) => {
          const col = SEGMENT_COLOR[r.segment];
          return (
            <TouchableOpacity key={r.key} style={styles.row} onPress={() => router.push(`/admin/customer/${encodeURIComponent(r.phone)}`)}>
              <View style={styles.av}>
                <Text style={styles.avText}>{r.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>
                  {r.phone}
                  {r.address ? ` · ${r.address}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.tag, { backgroundColor: col.bg }]}>
                  <Text style={[styles.tagText, { color: col.fg }]}>{SEGMENT_LABEL[r.segment]}</Text>
                </View>
                <Text style={styles.meta}>
                  {r.orders} orders · {formatINR(r.spend)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {visible.length === 0 && <Text style={styles.empty}>Is filter pe customer nahi mila.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 12 },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: AdminColors.purple, borderColor: AdminColors.purple },
  chipText: { fontSize: 12, fontWeight: '700', color: AdminColors.text },
  chipTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: AdminColors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: AdminColors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  avText: { color: AdminColors.purple, fontWeight: '800' },
  name: { fontWeight: '700', color: AdminColors.text },
  meta: { color: AdminColors.muted, fontSize: 12, marginTop: 2 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  tagText: { fontSize: 10, fontWeight: '800' },
  empty: { padding: 20, color: AdminColors.muted },
});
