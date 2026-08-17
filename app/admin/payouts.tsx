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
  Modal,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  IndianRupee,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Save,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

type TechWithPayouts = {
  id: string;
  name: string;
  phone: string;
  skills: string;
};

type CompletedBooking = {
  id: string;
  service_name: string;
  customer_name: string;
  total_amount: number;
  scheduled_date: string;
  technician_id: string;
};

export default function AdminPayoutsScreen() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<TechWithPayouts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [commissionRate, setCommissionRate] = useState('20');
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([]);
  const [existingPayoutBookingIds, setExistingPayoutBookingIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('admin_logged_in') !== 'true') {
        router.replace('/admin/login');
        return;
      }
      setRole(sessionStorage.getItem('admin_role') as 'super' | 'viewer' || 'super');
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [payoutRes, techRes, settingsRes] = await Promise.all([
        supabase.from('technician_payouts').select(`
          *,
          bookings!inner(service_name, scheduled_date, customer_name),
          technicians!inner(name)
        `).order('created_at', { ascending: false }),
        supabase.from('technicians').select('*').order('name'),
        supabase.from('admin_settings').select('commission_rate').limit(1).maybeSingle(),
      ]);

      setPayouts(payoutRes.data || []);
      setTechnicians(techRes.data || []);
      if (settingsRes.data?.commission_rate !== undefined) {
        setCommissionRate(String(settingsRes.data.commission_rate));
      }
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const saveCommissionRate = async () => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Error', 'Commission rate 0 se 100 ke beech hona chahiye');
      return;
    }

    setRateLoading(true);
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!settings) {
      Alert.alert('Error', 'Settings not found');
      setRateLoading(false);
      return;
    }

    const { error } = await supabase
      .from('admin_settings')
      .update({ commission_rate: rate })
      .eq('id', settings.id);

    setRateLoading(false);

    if (error) {
      Alert.alert('Error', 'Rate save nahi hua. Phir try karein.');
      return;
    }

    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2000);
  };

  const openGenerateModal = async () => {
    if (role === 'viewer') return;
    setGenerateModal(true);
    setSelectedTech(null);

    const [bookingsRes, payoutsRes] = await Promise.all([
      supabase.from('bookings').select('id, service_name, customer_name, total_amount, scheduled_date, technician_id')
        .eq('status', 'completed')
        .not('technician_id', 'is', null)
        .order('scheduled_date', { ascending: false }),
      supabase.from('technician_payouts').select('booking_id'),
    ]);

    setCompletedBookings(bookingsRes.data || []);
    setExistingPayoutBookingIds(new Set((payoutsRes.data || []).map((p: { booking_id: string }) => p.booking_id)));
  };

  const generatePayout = async (booking: CompletedBooking) => {
    const rate = parseFloat(commissionRate) || 20;
    const commissionAmount = (Number(booking.total_amount) * rate) / 100;
    const payoutAmount = Number(booking.total_amount) - commissionAmount;

    setGenerating(true);
    const { error } = await supabase.from('technician_payouts').insert({
      technician_id: booking.technician_id,
      booking_id: booking.id,
      booking_amount: Number(booking.total_amount),
      commission_rate: rate,
      commission_amount: commissionAmount,
      payout_amount: payoutAmount,
      status: 'pending',
    });

    setGenerating(false);

    if (error) {
      Alert.alert('Error', 'Payout generate nahi hua. Phir try karein.');
      return;
    }

    setExistingPayoutBookingIds((prev) => new Set(prev).add(booking.id));
    loadData();
  };

  const markPaid = async (payoutId: string) => {
    const { error } = await supabase
      .from('technician_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payoutId);

    if (error) {
      Alert.alert('Error', 'Update nahi hua. Phir try karein.');
      return;
    }

    setPayouts((prev) =>
      prev.map((p) => p.id === payoutId ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p)
    );
  };

  const filteredBookings = selectedTech
    ? completedBookings.filter((b) => b.technician_id === selectedTech)
    : completedBookings;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const paidPayouts = payouts.filter((p) => p.status === 'paid');
  const totalPending = pendingPayouts.reduce((s, p) => s + Number(p.payout_amount), 0);
  const totalPaid = paidPayouts.reduce((s, p) => s + Number(p.payout_amount), 0);
  const totalCommission = payouts.reduce((s, p) => s + Number(p.commission_amount), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Payouts</Text>
            <Text style={styles.headerSubtitle}>Technician earnings & commission</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }]}>
            <Clock size={18} color={Colors.warning[600]} />
            <Text style={[styles.summaryLabel, { color: Colors.warning[600] }]}>Pending</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning[600] }]}>₹{totalPending.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }]}>
            <CheckCircle2 size={18} color={Colors.success[600]} />
            <Text style={[styles.summaryLabel, { color: Colors.success[600] }]}>Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.success[700] }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.commissionCard}>
          <View style={styles.commissionRow}>
            <TrendingUp size={18} color={Colors.accent[500]} />
            <Text style={styles.commissionText}>Total Commission Earned</Text>
            <Text style={styles.commissionAmount}>₹{totalCommission.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Commission rate setting */}
        {role === 'super' && (
          <View style={styles.rateCard}>
            <Text style={styles.sectionTitle}>Commission Rate</Text>
            <View style={styles.rateInputRow}>
              <View style={styles.rateInputWrap}>
                <Percent size={18} color={Colors.neutral[400]} />
                <TextInput
                  style={styles.rateInput}
                  value={commissionRate}
                  onChangeText={setCommissionRate}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <TouchableOpacity style={styles.saveRateBtn} onPress={saveCommissionRate} disabled={rateLoading}>
                {rateLoading ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <>
                    <Save size={16} color={Colors.neutral[0]} />
                    <Text style={styles.saveRateBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {rateSaved && (
              <Text style={styles.rateSavedText}>Rate saved successfully!</Text>
            )}
            <Text style={styles.rateHint}>
              Ye rate har naye payout par apply hoga. Technician ko booking amount se ye % commission deduct hoga.
            </Text>
          </View>
        )}

        {/* Generate payout button */}
        {role === 'super' && (
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={openGenerateModal}
            activeOpacity={0.8}
          >
            <Wallet size={18} color={Colors.neutral[0]} />
            <Text style={styles.generateBtnText}>Generate Payout for Completed Bookings</Text>
          </TouchableOpacity>
        )}

        {/* Payout list */}
        <Text style={styles.sectionTitle}>All Payouts ({payouts.length})</Text>
        {payouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Koi payout nahi</Text>
            <Text style={styles.emptyText}>Completed bookings ke liye payout generate karein</Text>
          </View>
        ) : (
          payouts.map((p) => {
            const booking = (p as any).bookings as { service_name: string; scheduled_date: string; customer_name: string } | undefined;
            const tech = (p as any).technicians as { name: string } | undefined;
            return (
              <View key={p.id} style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payoutService}>{booking?.service_name || 'Booking'}</Text>
                    <Text style={styles.payoutTech}>{tech?.name || 'Technician'} · {booking?.customer_name}</Text>
                    {booking?.scheduled_date && <Text style={styles.payoutDate}>{booking.scheduled_date}</Text>}
                  </View>
                  <View style={[
                    styles.payoutStatusBadge,
                    { backgroundColor: p.status === 'paid' ? `${Colors.success[600]}20` : `${Colors.warning[500]}20` }
                  ]}>
                    <Text style={[
                      styles.payoutStatusText,
                      { color: p.status === 'paid' ? Colors.success[600] : Colors.warning[600] }
                    ]}>
                      {p.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.payoutBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Booking</Text>
                    <Text style={styles.breakdownValue}>₹{Number(p.booking_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Commission ({p.commission_rate}%)</Text>
                    <Text style={[styles.breakdownValue, { color: Colors.error[600] }]}>-₹{Number(p.commission_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabelBold}>Payout</Text>
                    <Text style={styles.breakdownValueBold}>₹{Number(p.payout_amount).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {p.status === 'pending' && role === 'super' && (
                  <TouchableOpacity
                    style={styles.markPaidBtn}
                    onPress={() => markPaid(p.id)}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={16} color={Colors.success[600]} />
                    <Text style={styles.markPaidText}>Mark as Paid</Text>
                  </TouchableOpacity>
                )}

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

      {/* Generate Payout Modal */}
      <Modal visible={generateModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setGenerateModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Generate Payout</Text>
            <Text style={styles.modalSubtitle}>
              Completed bookings without payouts ({completedBookings.filter((b) => !existingPayoutBookingIds.has(b.id)).length} pending)
            </Text>

            {/* Technician filter */}
            <View style={styles.techFilterRow}>
              <TouchableOpacity
                style={[styles.techFilterOption, !selectedTech && styles.techFilterActive]}
                onPress={() => setSelectedTech(null)}
              >
                <Text style={[styles.techFilterText, !selectedTech && styles.techFilterTextActive]}>All</Text>
              </TouchableOpacity>
              {technicians.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.techFilterOption, selectedTech === t.id && styles.techFilterActive]}
                  onPress={() => setSelectedTech(t.id)}
                >
                  <Text style={[styles.techFilterText, selectedTech === t.id && styles.techFilterTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {filteredBookings.filter((b) => !existingPayoutBookingIds.has(b.id)).length === 0 ? (
                <Text style={styles.emptyText}>Sab completed bookings ka payout already generated hai!</Text>
              ) : (
                filteredBookings
                  .filter((b) => !existingPayoutBookingIds.has(b.id))
                  .map((b) => {
                    const rate = parseFloat(commissionRate) || 20;
                    const commission = (Number(b.total_amount) * rate) / 100;
                    const payout = Number(b.total_amount) - commission;
                    return (
                      <View key={b.id} style={styles.genBookingCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.genService}>{b.service_name}</Text>
                          <Text style={styles.genCustomer}>{b.customer_name} · {b.scheduled_date}</Text>
                          <Text style={styles.genPayout}>Payout: ₹{payout.toLocaleString('en-IN')} (after {rate}% commission)</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.genBtn}
                          onPress={() => generatePayout(b)}
                          disabled={generating}
                        >
                          {generating ? (
                            <ActivityIndicator size="small" color={Colors.neutral[0]} />
                          ) : (
                            <Text style={styles.genBtnText}>Generate</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[0],
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral[200],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  commissionCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.lg },
  commissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  commissionText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], flex: 1 },
  commissionAmount: { fontSize: 16, fontWeight: '700', color: Colors.accent[600] },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[700], marginBottom: Spacing.sm },
  rateCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.lg },
  rateInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  rateInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.neutral[200], gap: Spacing.sm,
  },
  rateInput: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  saveRateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
  },
  saveRateBtnText: { fontSize: 14, fontWeight: '700', color: Colors.neutral[0] },
  rateSavedText: { fontSize: 13, fontWeight: '600', color: Colors.success[600], marginTop: Spacing.xs },
  rateHint: { fontSize: 12, color: Colors.neutral[400], marginTop: Spacing.xs, lineHeight: 18 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingVertical: Spacing.sm + 4, borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  payoutCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.sm },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  payoutService: { fontSize: 15, fontWeight: '700', color: Colors.neutral[900] },
  payoutTech: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  payoutDate: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  payoutStatusBadge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: Radius.full },
  payoutStatusText: { fontSize: 11, fontWeight: '700' },
  payoutBreakdown: { marginTop: Spacing.sm, backgroundColor: Colors.neutral[50], borderRadius: Radius.md, padding: Spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  breakdownLabel: { fontSize: 13, color: Colors.neutral[500] },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  breakdownDivider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: 4 },
  breakdownLabelBold: { fontSize: 14, fontWeight: '700', color: Colors.neutral[900] },
  breakdownValueBold: { fontSize: 16, fontWeight: '700', color: Colors.success[700] },
  markPaidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.success[50], paddingVertical: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.success[100], marginTop: Spacing.sm,
  },
  markPaidText: { fontSize: 14, fontWeight: '700', color: Colors.success[600] },
  paidDate: { fontSize: 11, color: Colors.success[600], marginTop: Spacing.xs, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.lg, width: '85%', maxWidth: 400, gap: Spacing.xs },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  modalSubtitle: { fontSize: 13, color: Colors.neutral[500], marginBottom: Spacing.sm },
  techFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  techFilterOption: { paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.neutral[100] },
  techFilterActive: { backgroundColor: Colors.primary[600] },
  techFilterText: { fontSize: 12, fontWeight: '600', color: Colors.neutral[600] },
  techFilterTextActive: { color: Colors.neutral[0] },
  genBookingCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.xs },
  genService: { fontSize: 14, fontWeight: '700', color: Colors.neutral[900] },
  genCustomer: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  genPayout: { fontSize: 12, color: Colors.success[600], fontWeight: '600', marginTop: 2 },
  genBtn: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  genBtnText: { fontSize: 12, fontWeight: '700', color: Colors.neutral[0] },
});
