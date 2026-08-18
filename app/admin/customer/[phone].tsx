import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Booking, Complaint, Customer } from '@/lib/supabase';
import { AdminColors, formatINR, shortId, statusColor } from '@/lib/admin';
import {
  SEGMENT_COLOR,
  SEGMENT_LABEL,
  isBlacklisted,
  loadBlacklist,
  saveBlacklist,
  segmentFor,
  spendOf,
} from '@/lib/customerSegment';

export default function CustomerProfileScreen() {
  const { phone: raw } = useLocalSearchParams<{ phone: string }>();
  const phone = decodeURIComponent(raw || '');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [blacklist, setBlacklist] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [c, b, k] = await Promise.all([
      supabase.from('customers').select('*').eq('phone', phone).maybeSingle(),
      supabase.from('bookings').select('*').eq('phone', phone).order('created_at', { ascending: false }),
      supabase.from('complaints').select('*').eq('phone', phone).order('created_at', { ascending: false }),
    ]);
    setCustomer((c.data as Customer) || null);
    setBookings((b.data as Booking[]) || []);
    setComplaints((k.data as Complaint[]) || []);
    setBlacklist(loadBlacklist());
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    load();
  }, [load]);

  const name = customer?.name || bookings[0]?.customer_name || 'Customer';
  const address = customer?.address || bookings[0]?.address || '—';
  const spend = useMemo(() => spendOf(bookings), [bookings]);
  const blacklisted = isBlacklisted(phone, blacklist);
  const segment = segmentFor(bookings.length, spend, blacklisted);
  const col = SEGMENT_COLOR[segment];

  const toggleBlacklist = () => {
    const next = blacklisted ? blacklist.filter((p) => p !== phone) : [...blacklist, phone];
    saveBlacklist(next);
    setBlacklist(next);
    Alert.alert(blacklisted ? 'Removed' : 'Blacklisted', blacklisted ? 'Ab booking allowed hai.' : 'Is number se nayi booking block hogi.');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <TouchableOpacity onPress={() => router.push('/admin/customers')}>
        <Text style={styles.back}>← Customers</Text>
      </TouchableOpacity>

      <View style={styles.head}>
        <View>
          <Text style={styles.h1}>{name}</Text>
          <Text style={styles.meta}>{phone}</Text>
          <Text style={styles.meta}>{address}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: col.bg }]}>
          <Text style={[styles.tagText, { color: col.fg }]}>{SEGMENT_LABEL[segment]}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statL}>Total orders</Text>
          <Text style={styles.statV}>{bookings.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statL}>Completed spend</Text>
          <Text style={styles.statV}>{formatINR(spend)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statL}>Complaints</Text>
          <Text style={styles.statV}>{complaints.length}</Text>
        </View>
      </View>

      <Text style={styles.hint}>VIP = 3+ orders + ₹5000+ spend · Repeat = 3+ orders · High value = ₹5000+</Text>

      <TouchableOpacity style={[styles.blBtn, blacklisted && styles.blBtnOn]} onPress={toggleBlacklist}>
        <Text style={[styles.blText, blacklisted && { color: '#fff' }]}>
          {blacklisted ? 'Blacklist se hatao' : 'Blacklist (fake booking)'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.h2}>Booking history</Text>
      <View style={styles.card}>
        {bookings.map((b) => {
          const st = statusColor(b.status);
          return (
            <TouchableOpacity key={b.id} style={styles.row} onPress={() => router.push(`/admin/job/${b.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.service_name}</Text>
                <Text style={styles.meta}>
                  {shortId(b.id)} · {b.scheduled_date} {b.scheduled_time}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: st.bg }]}>
                <Text style={[styles.pillText, { color: st.fg }]}>{b.status}</Text>
              </View>
              <Text style={styles.amt}>{formatINR(Number(b.total_amount))}</Text>
            </TouchableOpacity>
          );
        })}
        {bookings.length === 0 && <Text style={styles.empty}>Koi booking nahi.</Text>}
      </View>

      <Text style={styles.h2}>Complaints / tickets</Text>
      <View style={styles.card}>
        {complaints.map((c) => (
          <TouchableOpacity key={c.id} style={styles.row} onPress={() => router.push('/admin/complaints')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.subject}</Text>
              <Text style={styles.meta}>{c.description}</Text>
            </View>
            <Text style={styles.meta}>{c.status}</Text>
          </TouchableOpacity>
        ))}
        {complaints.length === 0 && <Text style={styles.empty}>Koi complaint nahi.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22, paddingBottom: 40 },
  back: { color: AdminColors.purple, fontWeight: '700', marginBottom: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  h2: { fontSize: 15, fontWeight: '800', color: AdminColors.text, marginTop: 18, marginBottom: 8 },
  meta: { color: AdminColors.muted, fontSize: 12, marginTop: 2 },
  hint: { color: AdminColors.muted, fontSize: 11, marginBottom: 10 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontWeight: '800', fontSize: 12 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 12, padding: 12 },
  statL: { fontSize: 11, color: AdminColors.muted, fontWeight: '700' },
  statV: { fontSize: 18, fontWeight: '800', marginTop: 4, color: AdminColors.text },
  blBtn: { borderWidth: 1, borderColor: AdminColors.red, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  blBtnOn: { backgroundColor: AdminColors.red },
  blText: { color: AdminColors.red, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: AdminColors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  name: { fontWeight: '700', color: AdminColors.text },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  amt: { fontWeight: '800', width: 80, textAlign: 'right' },
  empty: { padding: 16, color: AdminColors.muted },
});
