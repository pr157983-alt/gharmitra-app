import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Calendar, Clock, ChevronRight, Package, User, LogIn } from 'lucide-react-native';
import { supabase, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { readCustomerSession } from '@/lib/customerSession';

const ACTIVE = ['pending', 'confirmed', 'in_progress'];

const statusColors: Record<string, string> = {
  pending: Colors.warning[500],
  confirmed: Colors.primary[600],
  in_progress: Colors.accent[500],
};

function label(status: string) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'confirmed') return 'Accepted';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ActiveOrdersScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  const hydrate = useCallback(() => {
    const s = readCustomerSession();
    setCustomerId(s.id);
    setCustomerPhone(s.phone);
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const load = useCallback(async () => {
    if (!customerId && !customerPhone) {
      setBookings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      let q = supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (customerId && customerPhone) q = q.or(`customer_id.eq.${customerId},phone.eq.${customerPhone}`);
      else if (customerId) q = q.eq('customer_id', customerId);
      else q = q.eq('phone', customerPhone);
      const { data } = await q;
      setBookings(((data as Booking[]) || []).filter((b) => ACTIVE.includes(b.status)));
    } catch {
      /* ignore */
    }
    setLoading(false);
    setRefreshing(false);
  }, [customerId, customerPhone]);

  useEffect(() => {
    load();
  }, [load]);

  if (!customerId && !customerPhone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Active</Text>
          <Text style={styles.sub}>Live jobs yahan dikhenge</Text>
        </View>
        <View style={styles.loginPrompt}>
          <User size={48} color={Colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Login karein</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.push('/customer/login')}>
            <LogIn size={18} color={Colors.neutral[0]} />
            <Text style={styles.btnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active</Text>
        <Text style={styles.sub}>{bookings.length} live order</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {bookings.length === 0 ? (
          <View style={styles.empty}>
            <Package size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Koi active order nahi</Text>
            <Text style={styles.emptyText}>Pending / accepted / in-progress jobs yahan aayenge</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/services')}>
              <Text style={styles.btnText}>Book a service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((b) => (
            <TouchableOpacity key={b.id} style={styles.card} onPress={() => router.push(`/booking/${b.id}`)} activeOpacity={0.85}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{b.service_name}</Text>
                  <Text style={styles.pkg}>{b.package_name}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${statusColors[b.status] || Colors.neutral[400]}20` }]}>
                  <Text style={[styles.badgeText, { color: statusColors[b.status] || Colors.neutral[600] }]}>{label(b.status)}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Calendar size={14} color={Colors.neutral[400]} />
                <Text style={styles.meta}>{b.scheduled_date}</Text>
                <Clock size={14} color={Colors.neutral[400]} />
                <Text style={styles.meta}>{b.scheduled_time}</Text>
              </View>
              <View style={styles.footer}>
                <Text style={styles.amount}>₹{b.total_amount}</Text>
                <ChevronRight size={18} color={Colors.neutral[400]} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: Colors.neutral[900] },
  sub: { fontSize: 14, color: Colors.neutral[500], marginTop: 2 },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  name: { fontSize: 16, fontWeight: '800', color: Colors.neutral[900] },
  pkg: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: Colors.neutral[600], marginRight: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.primary[700] },
});
