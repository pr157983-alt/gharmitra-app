import { useState, useEffect, useCallback } from 'react';
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
import { Calendar, Clock, Phone, ChevronRight, Package, User, LogIn } from 'lucide-react-native';
import { supabase, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { readCustomerSession } from '@/lib/customerSession';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];
  pending: Colors.warning[500],
  confirmed: Colors.primary[600],
  in_progress: Colors.accent[500],
  completed: Colors.success[600],
  cancelled: Colors.error[500],
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');

  const [customerPhone, setCustomerPhone] = useState('');
  const [filter, setFilter] = useState('all');

  const hydrate = useCallback(() => {
    const s = readCustomerSession();
    setCustomerId(s.id);
    setCustomerName(s.name);
    setCustomerPhone(s.phone);
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const loadBookings = useCallback(async () => {
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
      setBookings(data || []);
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, [customerId, customerPhone]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);
    loadBookings();
    return () => clearTimeout(timeout);
  }, [loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  if (!customerId && !customerPhone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <User size={48} color={Colors.neutral[300]} />
          <Text style={styles.loginTitle}>Login karein</Text>
          <Text style={styles.loginText}>
            Apni bookings dekhne ke liye pehle login karein
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/customer/login')}
          >
            <LogIn size={18} color={Colors.neutral[0]} />
            <Text style={styles.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {customerName ? `Namaste, ${customerName}` : `${bookings.length} total bookings`}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipOn]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {bookings.filter((b) => filter === 'all' || b.status === filter).length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Koi booking nahi</Text>
            <Text style={styles.emptyText}>Book a service and it will appear here</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/services')}
            >
              <Text style={styles.emptyButtonText}>Browse Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings
            .filter((b) => filter === 'all' || b.status === filter)
            .map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => router.push(`/booking/${booking.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingService}>{booking.service_name}</Text>
                  <Text style={styles.bookingPackage}>{booking.package_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColors[booking.status] || Colors.neutral[400]}20` }]}>
                  <Text style={[styles.statusText, { color: statusColors[booking.status] || Colors.neutral[600] }]}>
                    {booking.status === 'in_progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingMeta}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={Colors.neutral[400]} />
                  <Text style={styles.metaText}>{booking.scheduled_date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color={Colors.neutral[400]} />
                  <Text style={styles.metaText}>{booking.scheduled_time}</Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <Phone size={14} color={Colors.neutral[400]} />
                <Text style={styles.metaText}>{booking.phone}</Text>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingAmount}>₹{booking.total_amount}</Text>
                <ChevronRight size={18} color={Colors.neutral[400]} />
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  loginTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  loginText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, marginTop: Spacing.lg,
  },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[500], marginTop: 2 },
  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  filterChipOn: { backgroundColor: Colors.neutral[800], borderColor: Colors.neutral[800] },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.neutral[600] },
  filterTextOn: { color: Colors.neutral[0] },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400] },
  emptyButton: {
    marginTop: Spacing.md, backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '700', color: Colors.neutral[0] },
  bookingCard: {
    backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  bookingInfo: { flex: 1 },
  bookingService: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  bookingPackage: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingMeta: { flexDirection: 'row', gap: Spacing.md, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.neutral[600] },
  bookingFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  bookingAmount: { fontSize: 18, fontWeight: '700', color: Colors.primary[700] },
});
