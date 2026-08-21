import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Clock, CheckCircle2, TrendingUp, Wallet } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { readTechSession } from '@/lib/techSession';
import { useTechBookings } from '@/lib/useTechBookings';

export default function TechnicianEarningScreen() {
  const jobs = useTechBookings();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayouts = useCallback(async () => {
    const { id } = readTechSession();
    if (!id) return;
    const { data } = await supabase
      .from('technician_payouts')
      .select(`*, bookings!inner(service_name, scheduled_date)`)
      .eq('technician_id', id)
      .order('created_at', { ascending: false });
    setPayouts(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const onRefresh = () => {
    setRefreshing(true);
    jobs.onRefresh();
    loadPayouts();
  };

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const paidPayouts = payouts.filter((p) => p.status === 'paid');
  const totalEarnings = payouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const paidAmount = paidPayouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const totalCommission = payouts.reduce((sum, p) => sum + Number(p.commission_amount), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Earning</Text>
      <Text style={styles.sub}>Aaj: ₹{jobs.todayEarning} · {jobs.jobsDoneToday} jobs</Text>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.summaryCard, { backgroundColor: Colors.primary[600] }]}>
          <Wallet size={20} color={Colors.neutral[0]} />
          <Text style={styles.summaryLabel}>Total payouts</Text>
          <Text style={styles.summaryValue}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.mini, { backgroundColor: Colors.warning[50] }]}>
            <Clock size={18} color={Colors.warning[600]} />
            <Text style={[styles.miniLbl, { color: Colors.warning[600] }]}>Pending</Text>
            <Text style={[styles.miniVal, { color: Colors.warning[600] }]}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.mini, { backgroundColor: Colors.success[50] }]}>
            <CheckCircle2 size={18} color={Colors.success[600]} />
            <Text style={[styles.miniLbl, { color: Colors.success[600] }]}>Paid</Text>
            <Text style={[styles.miniVal, { color: Colors.success[700] }]}>₹{paidAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <View style={styles.commission}>
          <TrendingUp size={18} color={Colors.accent[500]} />
          <Text style={styles.commissionText}>Commission deducted</Text>
          <Text style={styles.commissionAmount}>₹{totalCommission.toLocaleString('en-IN')}</Text>
        </View>
        <Text style={styles.section}>All payouts ({payouts.length})</Text>
        {payouts.length === 0 ? (
          <Text style={styles.empty}>Jab admin payout generate karega, yahan dikhega</Text>
        ) : (
          payouts.map((p) => {
            const booking = p.bookings as { service_name: string; scheduled_date: string } | undefined;
            return (
              <View key={p.id} style={styles.card}>
                <Text style={styles.svc}>{booking?.service_name || 'Booking'}</Text>
                <Text style={styles.muted}>{booking?.scheduled_date} · {p.status}</Text>
                <Text style={styles.amt}>₹{Number(p.payout_amount).toLocaleString('en-IN')}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sub: { fontSize: 13, color: Colors.neutral[500], paddingHorizontal: Spacing.lg, marginBottom: 8 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  summaryCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: 6, marginBottom: Spacing.md },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: Colors.neutral[0], opacity: 0.9 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.neutral[0] },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  mini: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  miniLbl: { fontSize: 12, fontWeight: '600' },
  miniVal: { fontSize: 18, fontWeight: '800' },
  commission: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.lg },
  commissionText: { flex: 1, fontWeight: '600', color: Colors.neutral[700] },
  commissionAmount: { fontWeight: '800', color: Colors.accent[600] },
  section: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm },
  empty: { color: Colors.neutral[400] },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: 8 },
  svc: { fontWeight: '800', color: Colors.neutral[900] },
  muted: { color: Colors.neutral[500], fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  amt: { fontWeight: '800', color: Colors.success[700], marginTop: 6 },
});
