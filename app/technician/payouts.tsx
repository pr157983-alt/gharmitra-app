import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  IndianRupee,
  Clock,
  CheckCircle2,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function TechnicianPayoutsScreen() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [techId, setTechId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = sessionStorage.getItem('tech_id');
      if (!id) {
        router.replace('/technician/login');
        return;
      }
      setTechId(id);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    if (!techId) return;
    try {
      const { data } = await supabase
        .from('technician_payouts')
        .select(`
          *,
          bookings!inner(service_name, scheduled_date)
        `)
        .eq('technician_id', techId)
        .order('created_at', { ascending: false });
      setPayouts(data || []);
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, [techId]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayouts();
  }, [loadPayouts]);

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const paidPayouts = payouts.filter((p) => p.status === 'paid');
  const totalEarnings = payouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const paidAmount = paidPayouts.reduce((sum, p) => sum + Number(p.payout_amount), 0);
  const totalCommission = payouts.reduce((sum, p) => sum + Number(p.commission_amount), 0);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Payouts</Text>
          <Text style={styles.headerSubtitle}>Aapki earnings aur commission</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primary[600] }]}>
            <Wallet size={20} color={Colors.neutral[0]} />
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryValue}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }]}>
            <Clock size={18} color={Colors.warning[600]} />
            <Text style={[styles.summaryLabel, { color: Colors.warning[600] }]}>Pending</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning[600] }]}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }]}>
            <CheckCircle2 size={18} color={Colors.success[600]} />
            <Text style={[styles.summaryLabel, { color: Colors.success[600] }]}>Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.success[700] }]}>₹{paidAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Commission info */}
        <View style={styles.commissionCard}>
          <View style={styles.commissionRow}>
            <TrendingUp size={18} color={Colors.accent[500]} />
            <Text style={styles.commissionText}>Total Commission Deducted</Text>
            <Text style={styles.commissionAmount}>₹{totalCommission.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payout list */}
        <Text style={styles.sectionTitle}>All Payouts ({payouts.length})</Text>
        {payouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Koi payout nahi</Text>
            <Text style={styles.emptyText}>Jab admin aapke completed bookings ka payout generate karega, yahan dikhega</Text>
          </View>
        ) : (
          payouts.map((p) => {
            const booking = (p as any).bookings as { service_name: string; scheduled_date: string } | undefined;
            return (
              <View key={p.id} style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <Text style={styles.payoutService}>
                    {booking?.service_name || 'Booking'}
                  </Text>
                  <View style={[
                    styles.payoutStatusBadge,
                    { backgroundColor: `${Colors.warning[600]}20` }
                  ]}>
                    <Text style={[
                      styles.payoutStatusText,
                      { color: p.status === 'paid' ? Colors.success[600] : Colors.warning[600] }
                    ]}>
                      {p.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {booking?.scheduled_date && (
                  <Text style={styles.payoutDate}>{booking.scheduled_date}</Text>
                )}

                <View style={styles.payoutBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Booking Amount</Text>
                    <Text style={styles.breakdownValue}>₹{Number(p.booking_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Commission ({p.commission_rate}%)</Text>
                    <Text style={[styles.breakdownValue, { color: Colors.error[600] }]}>-₹{Number(p.commission_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabelBold}>Your Payout</Text>
                    <Text style={styles.breakdownValueBold}>₹{Number(p.payout_amount).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {p.paid_at && (
                  <Text style={styles.paidDate}>
                    Paid on {new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[0],
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral[200],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: Colors.neutral[0], opacity: 0.9 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.neutral[0] },
  commissionCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.lg },
  commissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  commissionText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], flex: 1 },
  commissionAmount: { fontSize: 16, fontWeight: '700', color: Colors.accent[600] },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[700], marginBottom: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  payoutCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.sm },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  payoutService: { fontSize: 15, fontWeight: '700', color: Colors.neutral[900], flex: 1 },
  payoutStatusBadge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: Radius.full },
  payoutStatusText: { fontSize: 11, fontWeight: '700' },
  payoutDate: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  payoutBreakdown: { marginTop: Spacing.sm, backgroundColor: Colors.neutral[50], borderRadius: Radius.md, padding: Spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  breakdownLabel: { fontSize: 13, color: Colors.neutral[500] },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  breakdownDivider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: 4 },
  breakdownLabelBold: { fontSize: 14, fontWeight: '700', color: Colors.neutral[900] },
  breakdownValueBold: { fontSize: 16, fontWeight: '700', color: Colors.success[700] },
  paidDate: { fontSize: 11, color: Colors.success[600], marginTop: Spacing.xs, fontWeight: '600' },
});
