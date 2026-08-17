import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import {
  Home,
  CalendarCheck,
  Users,
  HardHat,
  Wrench,
  CreditCard,
  Percent,
  Wallet,
  FileSpreadsheet,
  Bell,
  Settings,
  User,
  LogOut,
  Search,
  Calendar,
  MessageSquare,
  Plus,
} from 'lucide-react-native';
import { AdminColors, getAdminRole } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

type NavItem = { label: string; href: string; icon: typeof Home; match?: string };

const MAIN: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: Home, match: '/admin' },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Staff', href: '/admin/technicians', icon: HardHat },
  { label: 'Services', href: '/admin/services', icon: Wrench },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

const PAYOUT: NavItem[] = [
  { label: 'Commission Rates', href: '/admin/commission', icon: Percent },
  { label: 'Technician Payout', href: '/admin/payouts', icon: Wallet },
];

const REPORTS: NavItem[] = [
  { label: 'Reports & Downloads', href: '/admin/reports', icon: FileSpreadsheet },
];

const OTHERS: NavItem[] = [
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Complaints', href: '/admin/complaints', icon: MessageSquare },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Profile', href: '/admin/profile', icon: User },
];

const QUICK = [
  { label: 'Add Booking', href: '/booking/new', color: AdminColors.purple, icon: Plus },
  { label: 'Add Technician', href: '/admin/technicians?add=1', color: AdminColors.blue, icon: HardHat },
  { label: 'Add Service', href: '/admin/services?add=1', color: AdminColors.green, icon: Wrench },
  { label: 'Notification', href: '/admin/notifications', color: AdminColors.orange, icon: Bell },
  { label: 'Commission', href: '/admin/commission', color: AdminColors.purpleDark, icon: Percent },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/');
}

export function AdminShell() {
  const pathname = usePathname();
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [search, setSearch] = useState('');
  const [notifCount, setNotifCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const r = getAdminRole();
    if (!r) {
      router.replace('/admin/login');
      return;
    }
    setRole(r);
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const [b, c] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setNotifCount((b.count || 0) + (c.count || 0));
    })();
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('admin-search');
        el?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const logout = () => {
    try {
      sessionStorage.removeItem('admin_logged_in');
      sessionStorage.removeItem('admin_role');
    } catch {
      /* ignore */
    }
    router.replace('/(tabs)/index');
  };

  const submitSearch = () => {
    const q = search.trim();
    if (!q) return;
    router.push(`/admin/bookings?q=${encodeURIComponent(q)}`);
  };

  const renderGroup = (title: string, items: NavItem[]) => (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        const badge = item.href === '/admin/notifications' ? notifCount : 0;
        return (
          <TouchableOpacity
            key={item.href}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => router.push(item.href as any)}
            activeOpacity={0.8}
          >
            <Icon size={16} color={active ? '#fff' : AdminColors.muted} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            {badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.shell}>
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <TouchableOpacity style={styles.brand} onPress={() => setSidebarOpen(false)} activeOpacity={0.8}>
            <View style={styles.logo}>
              <Home size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandName}>Ghar Mitra</Text>
              <Text style={styles.brandSub}>Close menu</Text>
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            {renderGroup('MAIN', MAIN)}
            {renderGroup('PAYOUT & COMMISSION', PAYOUT)}
            {renderGroup('REPORTS', REPORTS)}
            {renderGroup('OTHERS', OTHERS)}

            <View style={styles.group}>
              <Text style={styles.groupTitle}>QUICK ACTIONS</Text>
              {QUICK.map((q) => {
                const Icon = q.icon;
                return (
                  <TouchableOpacity
                    key={q.href}
                    style={[styles.quickBtn, { backgroundColor: q.color }]}
                    onPress={() => router.push(q.href as any)}
                  >
                    <Icon size={14} color="#fff" />
                    <Text style={styles.quickText}>{q.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.logout} onPress={logout}>
            <LogOut size={16} color={AdminColors.red} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.logo} onPress={() => setSidebarOpen((v) => !v)} activeOpacity={0.8}>
            <Home size={16} color="#fff" />
          </TouchableOpacity>
          <View style={styles.searchWrap}>
            <Search size={16} color={AdminColors.muted} />
            <TextInput
              nativeID="admin-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search bookings, customers, technicians..."
              placeholderTextColor={AdminColors.muted}
              style={styles.searchInput}
              onSubmitEditing={submitSearch}
            />
            <View style={styles.kbd}>
              <Text style={styles.kbdText}>Ctrl + K</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/admin/notifications')}>
            <Bell size={18} color={AdminColors.text} />
            {notifCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/admin/reports')}>
            <Calendar size={18} color={AdminColors.text} />
          </TouchableOpacity>
          <View style={styles.user}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.userName}>Admin</Text>
              <Text style={styles.userRole}>{role === 'viewer' ? 'Co-Admin' : 'Super Admin'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Slot />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Ghar Mitra. All rights reserved.</Text>
          <Text style={styles.footerText}>Made with ❤️ for Better Service</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    backgroundColor: AdminColors.bg,
    ...(Platform.OS === 'web' ? ({ height: '100vh' } as object) : { flex: 1 }),
  },
  sidebar: {
    width: 210,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: AdminColors.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 4 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: AdminColors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 14, fontWeight: '800', color: AdminColors.text },
  brandSub: { fontSize: 10, color: AdminColors.muted, marginTop: 1 },
  group: { marginBottom: 12 },
  groupTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: AdminColors.muted,
    letterSpacing: 0.7,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: AdminColors.purple },
  navLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: AdminColors.text },
  navLabelActive: { color: '#fff' },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  quickText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  logoutText: { color: AdminColors.red, fontWeight: '700', fontSize: 12 },
  main: { flex: 1, minWidth: 0 },
  topbar: {
    height: 58,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AdminColors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, color: AdminColors.text, height: 38 },
  kbd: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  kbdText: { fontSize: 10, color: AdminColors.muted, fontWeight: '600' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AdminColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AdminColors.red,
  },
  user: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 6 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AdminColors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: AdminColors.purple, fontWeight: '800' },
  userName: { fontSize: 13, fontWeight: '700', color: AdminColors.text },
  userRole: { fontSize: 11, color: AdminColors.muted },
  content: { flex: 1, minHeight: 0, ...(Platform.OS === 'web' ? ({ overflowY: 'auto' } as object) : null) },
  footer: {
    height: 40,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  footerText: { fontSize: 11, color: AdminColors.muted },
});
