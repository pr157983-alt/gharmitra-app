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
  TrendingUp,
  CheckCircle2,
  Clock,
  IndianRupee,
  Star,
  Calendar,
  Award,
  Activity,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

type PerfStats = {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  cancelled: number;
  totalEarnings: number;
  avgRating: number;
  completionRate: number;
  thisMonth: number;
};

export default function TechnicianPerformanceScreen() {
  const [stats, setStats] = useState<PerfStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [techId, setTechId] = useState<string | null>(null);
  const [recentBookings, setRecentBookings] = useState<{ id: string; service_name: string; status: string; total_amount: number; scheduled_date: string }[]>([]);

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

  const loadStats = useCallback(async () => {
    if (!techId) return;
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, service_name, status, total_amount, scheduled_date')
        .eq('technician_id', techId)
        .order('scheduled_date', { ascending: false });

      if (!bookings) {
        setLoading(false);
        return;
      }

      const completed = bookings.filter((b: { status: string }) => b.status === 'completed');
      const cancelled = bookings.filter((b: { status: string }) => b.status === 'cancelled');
      const inProgress = bookings.filter((b: { status: string }) => b.status === 'in_progress');
      const totalEarnings = completed.reduce((sum: number, b: { total_amount: number }) => sum + Number(b.total_amount), 0);

      const now = new Date();
      const thisMonth = completed.filter((b: { scheduled_date: string }) => {
        const d = new Date(b.scheduled_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((sum: number, b: { total_amount: number }) => sum + Number(b.total_amount), 0);

      const completionRate = bookings.length > 0
        ? Math.round((completed.length / bookings.length) * 100)
        : 0;

      setStats({
        totalAssigned: bookings.length,
        completed: completed.length,
        inProgress: inProgress.length,
        cancelled: cancelled.length,
        totalEarnings,
        avgRating: 0,
        completionRate,
        thisMonth,
      });
      setRecentBookings(bookings.slice(0, 5));
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, [techId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  if (loading || !stats) {
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
          <Text style={styles.headerTitle}>Performance</Text>
          <Text style={styles.headerSubtitle}>Aapki work statistics</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top stats cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.success[50] }]}>
            <View style={[styles.statIcon, { backgroundColor: Colors.success[500] }]}>
              <CheckCircle2 size={18} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.primary[50] }]}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primary[600] }]}>
              <Activity size={18} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.statValue}>{stats.totalAssigned}</Text>
            <Text style={styles.statLabel}>Total Assigned</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.accent[50] }]}>
            <View style={[styles.statIcon, { backgroundColor: Colors.accent[500] }]}>
              <Clock size={18} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.error[50] }]}>
            <View style={[styles.statIcon, { backgroundColor: Colors.error[500] }]}>
              <Calendar size={18} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.statValue}>{stats.cancelled}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
        </View>

        {/* Earnings */}
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.earningsCard}>
          <View style={styles.earningRow}>
            <View style={[styles.earningIcon, { backgroundColor: `${Colors.success[600]}15` }]}>
              <IndianRupee size={18} color={Colors.success[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.earningLabel}>Total Earnings</Text>
              <Text style={styles.earningValue}>₹{stats.totalEarnings.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningRow}>
            <View style={[styles.earningIcon, { backgroundColor: `${Colors.primary[600]}15` }]}>
              <TrendingUp size={18} color={Colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.earningLabel}>This Month</Text>
              <Text style={styles.earningValue}>₹{stats.thisMonth.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Completion Rate */}
        <Text style={styles.sectionTitle}>Completion Rate</Text>
        <View style={styles.rateCard}>
          <View style={styles.rateHeader}>
            <Award size={20} color={Colors.primary[600]} />
            <Text style={styles.rateText}>{stats.completionRate}% jobs completed</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.completionRate}%` }]} />
          </View>
        </View>

        {/* Recent bookings */}
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {recentBookings.length === 0 ? (
          <Text style={styles.emptyText}>Abhi koi booking assigned nahi</Text>
        ) : (
          recentBookings.map((b) => (
            <View key={b.id} style={styles.recentCard}>
              <View style={styles.recentLeft}>
                <Text style={styles.recentService}>{b.service_name}</Text>
                <Text style={styles.recentDate}>{b.scheduled_date}</Text>
              </View>
              <View style={styles.recentRight}>
                <Text style={[styles.recentStatus, { color: b.status === 'completed' ? Colors.success[600] : b.status === 'cancelled' ? Colors.error[500] : Colors.warning[500] }]}>
                  {b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </Text>
                <Text style={styles.recentAmount}>₹{b.total_amount}</Text>
              </View>
            </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[0],
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral[200],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  statIcon: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.neutral[500] },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[700], marginBottom: Spacing.sm, marginTop: Spacing.sm },
  earningsCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  earningIcon: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  earningLabel: { fontSize: 13, color: Colors.neutral[500] },
  earningValue: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  earningDivider: { height: 1, backgroundColor: Colors.neutral[100], marginVertical: Spacing.sm },
  rateCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  rateHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  rateText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  progressBar: { height: 8, backgroundColor: Colors.neutral[100], borderRadius: Radius.full, overflow: 'hidden' as const },
  progressFill: { height: '100%', backgroundColor: Colors.primary[600], borderRadius: Radius.full },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
  recentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.sm },
  recentLeft: { flex: 1 },
  recentService: { fontSize: 14, fontWeight: '600', color: Colors.neutral[900] },
  recentDate: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  recentRight: { alignItems: 'flex-end' },
  recentStatus: { fontSize: 12, fontWeight: '700' },
  recentAmount: { fontSize: 14, fontWeight: '700', color: Colors.primary[700], marginTop: 2 },
});
