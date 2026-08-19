import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  User,
  Phone,
  MapPin,
  ChevronRight,
  HelpCircle,
  Shield,
  Wrench,
  LogOut,
  MessageSquare,
  CalendarCheck,
  LogIn,
  BadgePercent,
  Star,
  Settings,
  Wallet,
} from 'lucide-react-native';
import { supabase, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { clearCustomerSession, readCustomerSession } from '@/lib/customerSession';
import { formatINR } from '@/lib/admin';

export default function ProfileScreen() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bookingsCount, setBookingsCount] = useState(0);
  const [spend, setSpend] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const refresh = useCallback(async () => {
    const s = readCustomerSession();
    setCustomerId(s.id);
    setCustomerName(s.name);
    setCustomerPhone(s.phone);
    if (!s.id && !s.phone) {
      setBookingsCount(0);
      setSpend(0);
      setComplaintsCount(0);
      setAddress('');
      setLoading(false);
      return;
    }
    try {
      let bq = supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (s.id && s.phone) bq = bq.or(`customer_id.eq.${s.id},phone.eq.${s.phone}`);
      else if (s.id) bq = bq.eq('customer_id', s.id);
      else bq = bq.eq('phone', s.phone);
      const [bRes, cRes, uRes] = await Promise.all([
        bq,
        s.id ? supabase.from('complaints').select('id').eq('customer_id', s.id) : Promise.resolve({ data: [] }),
        s.id ? supabase.from('customers').select('address').eq('id', s.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const list = (bRes.data || []) as Booking[];
      setBookingsCount(list.length);
      setSpend(list.filter((x) => x.status === 'completed').reduce((n, x) => n + Number(x.total_amount || 0), 0));
      setComplaintsCount((cRes.data || []).length);
      setAddress((uRes.data?.address as string) || list[0]?.address || '');
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const performLogout = () => {
    clearCustomerSession();
    setShowLogoutModal(false);
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    router.replace('/(tabs)/index');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={40} color={Colors.neutral[0]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{customerName || 'Guest'}</Text>
            <Text style={styles.profileSub}>{customerPhone ? `+91 ${customerPhone}` : 'Login karke bookings dekhein'}</Text>
            <View style={styles.verifiedBadge}>
              <Shield size={10} color={Colors.neutral[0]} />
              <Text style={styles.verifiedText}>{customerId ? 'Logged in' : 'Guest'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {loading ? (
            <ActivityIndicator style={{ flex: 1, paddingVertical: 16 }} color={Colors.primary[600]} />
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{bookingsCount}</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatINR(spend)}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{complaintsCount}</Text>
                <Text style={styles.statLabel}>Complaints</Text>
              </View>
            </>
          )}
        </View>

        {customerId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/(tabs)/bookings')}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                  <CalendarCheck size={18} color={Colors.primary[600]} />
                </View>
                <Text style={styles.menuLabel}>My Bookings</Text>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/customer/addresses')}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.success[600]}15` }]}>
                  <MapPin size={18} color={Colors.success[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>Saved addresses</Text>
                  <Text style={styles.menuSub}>Home / Office</Text>
                </View>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/customer/reviews')}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.accent[500]}15` }]}>
                  <Star size={18} color={Colors.accent[600]} />
                </View>
                <Text style={styles.menuLabel}>My reviews</Text>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/customer/wallet')}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.success[600]}15` }]}>
                  <Wallet size={18} color={Colors.success[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>Wallet</Text>
                  <Text style={styles.menuSub}>Balance & add money</Text>
                </View>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/customer/complaints')}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.error[500]}15` }]}>
                  <MessageSquare size={18} color={Colors.error[500]} />
                </View>
                <Text style={styles.menuLabel}>My Complaints</Text>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity style={styles.loginPromptBtn} onPress={() => router.push('/customer/login')}>
              <LogIn size={18} color={Colors.neutral[0]} />
              <Text style={styles.loginPromptText}>Login / Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {customerId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.card}>
              <View style={styles.contactRow}>
                <View style={[styles.contactIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                  <Phone size={16} color={Colors.primary[600]} />
                </View>
                <Text style={styles.contactText}>{customerPhone ? `+91 ${customerPhone}` : '—'}</Text>
              </View>
              {!!address && (
                <>
                  <View style={styles.contactDivider} />
                  <View style={styles.contactRow}>
                    <View style={[styles.contactIconWrap, { backgroundColor: `${Colors.success[600]}15` }]}>
                      <MapPin size={16} color={Colors.success[600]} />
                    </View>
                    <Text style={styles.contactText}>{address}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/customer/offers')}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.accent[500]}15` }]}>
                <BadgePercent size={18} color={Colors.accent[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Offers & coupons</Text>
                <Text style={styles.menuSub}>Live deals + checkout codes</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/customer/help')}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                <HelpCircle size={18} color={Colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Help, safety & helpline</Text>
                <Text style={styles.menuSub}>Booking, payment, warranty</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/customer/settings')}>
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.neutral[100] }]}>
                <Settings size={18} color={Colors.neutral[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Settings</Text>
                <Text style={styles.menuSub}>City</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff / Admin</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuRow, styles.menuBorder]} onPress={() => router.push('/admin/login')}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                <Shield size={18} color={Colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Admin Portal</Text>
                <Text style={styles.menuSub}>Sirf staff ke liye</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/technician/login')}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.accent[500]}15` }]}>
                <Wrench size={18} color={Colors.accent[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Technician Login</Text>
                <Text style={styles.menuSub}>Assigned jobs</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        {customerId ? (
          <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
            <LogOut size={18} color={Colors.error[600]} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.versionText}>Gharmitra v1.0.0</Text>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {showLogoutModal && (
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutModalTitle}>Log Out?</Text>
            <Text style={styles.logoutModalText}>Phir se login karke bookings dekh sakte ho.</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={performLogout}>
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scrollContent: { paddingBottom: Spacing.xl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary[600],
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.neutral[0] },
  profileSub: { fontSize: 14, color: Colors.neutral[0], opacity: 0.85, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.neutral[0] },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    minHeight: 72,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  statLabel: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.neutral[200] },
  section: { marginTop: Spacing.lg, paddingHorizontal: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[700], marginBottom: Spacing.sm },
  activeCard: {
    backgroundColor: Colors.neutral[800],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  activeEyebrow: { color: Colors.neutral[0], fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  activeName: { color: Colors.neutral[0], fontSize: 16, fontWeight: '800' },
  activeMeta: { color: Colors.neutral[300], marginTop: 4, fontSize: 12 },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm + 2,
  },
  contactDivider: { height: 1, backgroundColor: Colors.neutral[100], marginLeft: 54 },
  contactIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  contactText: { fontSize: 14, color: Colors.neutral[700], flex: 1 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm + 2,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], flex: 1 },
  menuSub: { fontSize: 12, color: Colors.neutral[400], marginTop: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.error[50],
    borderWidth: 1,
    borderColor: Colors.error[100],
    gap: Spacing.sm,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error[600] },
  versionText: { textAlign: 'center', fontSize: 12, color: Colors.neutral[400], marginTop: Spacing.lg },
  loginPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg,
  },
  loginPromptText: { fontSize: 14, fontWeight: '700', color: Colors.neutral[0] },
  logoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  logoutModal: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  logoutModalText: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', marginTop: Spacing.xs },
  logoutModalButtons: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.lg },
  logoutCancelBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], alignItems: 'center' },
  logoutCancelText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  logoutConfirmBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: Colors.error[500], alignItems: 'center' },
  logoutConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
});
