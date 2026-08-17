import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Heart,
  HelpCircle,
  Star,
  Gift,
  Shield,
  Wrench,
  LogOut,
  Bell,
  Settings,
  MessageSquare,
  CalendarCheck,
  LogIn,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

const menuItems = [
  { icon: Bell, label: 'Notifications', color: Colors.accent[500] },
  { icon: Heart, label: 'Saved Services', color: Colors.error[500] },
  { icon: Star, label: 'Reviews & Ratings', color: Colors.warning[500] },
  { icon: Gift, label: 'Refer & Earn', color: Colors.success[600] },
  { icon: Settings, label: 'App Settings', color: Colors.neutral[500] },
  { icon: Shield, label: 'Safety Guidelines', color: Colors.primary[600] },
  { icon: HelpCircle, label: 'Help & Support', color: Colors.neutral[400] },
];

export default function ProfileScreen() {
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomerId(sessionStorage.getItem('customer_id'));
      setCustomerName(sessionStorage.getItem('customer_name'));
      setCustomerPhone(sessionStorage.getItem('customer_phone'));
    }
  }, []);

  const performLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_logged_in');
      sessionStorage.removeItem('admin_role');
      sessionStorage.removeItem('tech_logged_in');
      sessionStorage.removeItem('tech_id');
      sessionStorage.removeItem('tech_name');
      sessionStorage.removeItem('customer_id');
      sessionStorage.removeItem('customer_name');
      sessionStorage.removeItem('customer_phone');
    }
    setShowLogoutModal(false);
    router.replace('/(tabs)/index');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile header with gradient-like effect */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={40} color={Colors.neutral[0]} />
            </View>
            <View style={styles.editBadge}>
              <Settings size={12} color={Colors.neutral[0]} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{customerName || 'Guest User'}</Text>
            <Text style={styles.profileSub}>{customerPhone ? `+91 ${customerPhone}` : 'Login to see your bookings'}</Text>
            <View style={styles.verifiedBadge}>
              <Shield size={10} color={customerName ? Colors.success[600] : Colors.neutral[400]} />
              <Text style={styles.verifiedText}>{customerName ? 'Verified' : 'Guest'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹2,450</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* My Activity */}
        {customerId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.menuRow, styles.menuBorder]}
                onPress={() => router.push('/(tabs)/bookings')}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                  <CalendarCheck size={18} color={Colors.primary[600]} />
                </View>
                <Text style={styles.menuLabel}>My Bookings</Text>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/customer/complaints')}
                activeOpacity={0.6}
              >
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
            <TouchableOpacity
              style={styles.loginPromptBtn}
              onPress={() => router.push('/customer/login')}
              activeOpacity={0.8}
            >
              <LogIn size={18} color={Colors.neutral[0]} />
              <Text style={styles.loginPromptText}>Login / Register to see bookings & complaints</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact info */}
        {customerId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.card}>
              <View style={styles.contactRow}>
                <View style={[styles.contactIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                  <Phone size={16} color={Colors.primary[600]} />
                </View>
                <Text style={styles.contactText}>{customerPhone ? `+91 ${customerPhone}` : '+91 98765 43210'}</Text>
              </View>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={[styles.contactIconWrap, { backgroundColor: `${Colors.accent[500]}15` }]}>
                  <Mail size={16} color={Colors.accent[500]} />
                </View>
                <Text style={styles.contactText}>{customerName ? `${customerName.toLowerCase().replace(/\s+/g, '.')}@gharmitra.in` : 'guest@example.com'}</Text>
              </View>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={[styles.contactIconWrap, { backgroundColor: `${Colors.success[600]}15` }]}>
                  <MapPin size={16} color={Colors.success[600]} />
                </View>
                <Text style={styles.contactText}>Bihar, India</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuRow, i < menuItems.length - 1 && styles.menuBorder]}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}15` }]}>
                  <item.icon size={18} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={Colors.neutral[300]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Business Portal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/admin/login')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.primary[600]}15` }]}>
                <Shield size={18} color={Colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Admin Portal</Text>
                <Text style={styles.menuSub}>Manage bookings, services & technicians</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
            <View style={styles.menuBorder} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/technician/login')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${Colors.accent[500]}15` }]}>
                <Wrench size={18} color={Colors.accent[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Technician Login</Text>
                <Text style={styles.menuSub}>Apni assigned bookings dekhein</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
          <LogOut size={18} color={Colors.error[600]} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Gharmitra v1.0.0</Text>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {showLogoutModal && (
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconWrap}>
              <LogOut size={28} color={Colors.error[500]} />
            </View>
            <Text style={styles.logoutModalTitle}>Log Out?</Text>
            <Text style={styles.logoutModalText}>Kya aap really log out karna chahte hain? Aap phir se login karke apni bookings dekh sakte hain.</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.7}>
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={performLogout} activeOpacity={0.7}>
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
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary[600],
    gap: Spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary[800],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral[0],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  profileSub: {
    fontSize: 14,
    color: Colors.neutral[0],
    opacity: 0.85,
    marginTop: 2,
  },
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
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm,
  },
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
  contactDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginLeft: Spacing.md + 28 + Spacing.sm + 2,
  },
  contactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: Colors.neutral[700],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm + 2,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  menuSub: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 1,
  },
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
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error[600],
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: Spacing.lg,
  },
  loginPromptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingVertical: Spacing.sm + 4, borderRadius: Radius.lg,
  },
  loginPromptText: { fontSize: 14, fontWeight: '700', color: Colors.neutral[0] },
  logoutOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
  logoutIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.error[50],
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  logoutModalText: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20, marginTop: Spacing.xs },
  logoutModalButtons: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.lg },
  logoutCancelBtn: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    backgroundColor: Colors.neutral[100], alignItems: 'center',
  },
  logoutCancelText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  logoutConfirmBtn: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    backgroundColor: Colors.error[500], alignItems: 'center',
  },
  logoutConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
});
