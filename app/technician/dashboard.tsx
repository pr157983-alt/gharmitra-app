import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Wrench,
  Calendar,
  Clock,
  Phone,
  MapPin,
  User,
  Package,
  IndianRupee,
  LogOut,
  CheckCircle2,
  Play,
  XCircle,
  KeyRound,
  Lock,
  AlertCircle,
  Navigation,
  Clock as ClockIcon,
  TrendingUp,
  Wallet,
  ChevronRight,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

type GeoCoords = { lat: number; lng: number };

async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function getCurrentPosition(): Promise<GeoCoords | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

async function watchPosition(
  callback: (coords: GeoCoords) => void
): Promise<{ remove: () => void } | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return {
      remove: () => navigator.geolocation.clearWatch(watchId),
    };
  }
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude })
  );
  return { remove: () => sub.remove() };
}

const statusColors: Record<string, string> = {
  pending: Colors.warning[500],
  confirmed: Colors.primary[600],
  in_progress: Colors.accent[500],
  completed: Colors.success[600],
  cancelled: Colors.error[500],
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TechnicianDashboardScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [techName, setTechName] = useState<string>('');

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (sessionStorage.getItem('tech_logged_in') !== 'true' || !sessionStorage.getItem('tech_id')) {
          router.replace('/technician/login');
          return;
        }
        setTechName(sessionStorage.getItem('tech_name') || 'Technician');
      }
    } catch {
      router.replace('/technician/login');
    }
  }, []);

  const loadBookings = useCallback(async () => {
    let techId: string | null = null;
    try {
      techId = typeof window !== 'undefined' ? sessionStorage.getItem('tech_id') : null;
    } catch {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!techId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('*')
      .eq('technician_id', techId)
      .order('scheduled_date', { ascending: true });
    if (queryError) {
      Alert.alert('Error', 'Bookings load nahi ho payi. Niche se refresh karein.');
    }
    setBookings(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Realtime: instant update when admin assigns a booking
  useEffect(() => {
    let techId: string | null = null;
    try {
      techId = typeof window !== 'undefined' ? sessionStorage.getItem('tech_id') : null;
    } catch {
      return;
    }
    if (!techId) return;

    const channel = supabase
      .channel(`tech_bookings_${techId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `technician_id=eq.${techId}` },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    setUpdatingId(null);

    if (error) {
      Alert.alert('Error', 'Status update nahi ho paya. Phir try karein.');
      return;
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    // Live location sharing: start when in_progress, stop otherwise
    if (newStatus === 'in_progress') {
      startLocationSharing(bookingId);
    } else {
      stopLocationSharing(bookingId);
    }
  };

  // --- Live location sharing ---
  const locationWatchRef = useRef<{ remove: () => void } | null>(null);
  const activeBookingRef = useRef<string | null>(null);

  const startLocationSharing = async (bookingId: string) => {
    stopLocationSharing();
    activeBookingRef.current = bookingId;

    let techId: string | null = null;
    try {
      techId = typeof window !== 'undefined' ? sessionStorage.getItem('tech_id') : null;
    } catch {
      // ignore
    }
    if (!techId) {
      Alert.alert('Error', 'Session expire ho gaya. Phir login karein.');
      return;
    }

    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Location Permission',
        'Location sharing ke liye permission zaroori hai. Settings mein allow karein.'
      );
      return;
    }

    // Insert initial location row
    const coords = await getCurrentPosition();
    if (coords) {
      await supabase.from('technician_locations').insert({
        technician_id: techId,
        booking_id: bookingId,
        lat: coords.lat,
        lng: coords.lng,
        is_sharing: true,
      });
    }

    // Start watching position
    const watcher = await watchPosition(async (pos) => {
      const bId = activeBookingRef.current;
      if (!bId || !techId) return;
      await supabase
        .from('technician_locations')
        .update({
          lat: pos.lat,
          lng: pos.lng,
          updated_at: new Date().toISOString(),
        })
        .eq('technician_id', techId)
        .eq('booking_id', bId);
    });
    locationWatchRef.current = watcher;
  };

  const stopLocationSharing = async (bookingId?: string) => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }

    let techId: string | null = null;
    try {
      techId = typeof window !== 'undefined' ? sessionStorage.getItem('tech_id') : null;
    } catch {
      // ignore
    }
    if (techId) {
      await supabase
        .from('technician_locations')
        .update({ is_sharing: false })
        .eq('technician_id', techId)
        .eq('booking_id', bookingId || activeBookingRef.current);
    }
    activeBookingRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopLocationSharing();
    };
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleChangePin = async () => {
    setPinError(null);

    if (!oldPin.trim() || !newPin.trim() || !confirmPin.trim()) {
      setPinError('Teenon field bharne zaroori hain');
      return;
    }
    if (newPin.trim().length < 4) {
      setPinError('Naya PIN kam se kam 4 digit ka hona chahiye');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setPinError('Naya PIN aur confirm PIN match nahi karte');
      return;
    }
    if (oldPin.trim() === newPin.trim()) {
      setPinError('Naya PIN purane PIN se alag hona chahiye');
      return;
    }

    setPinLoading(true);
    let techId: string | null = null;
    try {
      techId = typeof window !== 'undefined' ? sessionStorage.getItem('tech_id') : null;
    } catch {
      setPinError('Session problem. Phir login karein.');
      setPinLoading(false);
      return;
    }
    if (!techId) {
      setPinError('Session expire ho gaya. Phir login karein.');
      setPinLoading(false);
      return;
    }

    const { data: tech } = await supabase
      .from('technicians')
      .select('id')
      .eq('id', techId)
      .eq('pin', oldPin.trim())
      .maybeSingle();

    if (!tech) {
      setPinError('Purana PIN galat hai');
      setPinLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('technicians')
      .update({ pin: newPin.trim() })
      .eq('id', techId);

    setPinLoading(false);

    if (updateError) {
      setPinError('PIN update nahi ho paya. Phir try karein.');
      return;
    }

    setPinSuccess(true);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => {
      setPinSuccess(false);
      setShowPinChange(false);
    }, 1500);
  };

  const closePinModal = () => {
    setShowPinChange(false);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError(null);
    setPinSuccess(false);
  };

  const confirmLogout = () => {
    try {
      sessionStorage.removeItem('tech_logged_in');
      sessionStorage.removeItem('tech_id');
      sessionStorage.removeItem('tech_name');
    } catch {
      // ignore
    }
    setShowLogoutConfirm(false);
    router.replace('/technician/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'pending'
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Wrench size={22} color={Colors.neutral[0]} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Namaste, {techName}</Text>
              <Text style={styles.headerSubtitle}>Aapki assigned bookings</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.pinChangeButton} onPress={() => setShowPinChange(true)}>
              <KeyRound size={18} color={Colors.primary[600]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={18} color={Colors.error[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedBookings.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/technician/working-hours')} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary[50] }]}>
              <ClockIcon size={20} color={Colors.primary[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Working Hours</Text>
            <ChevronRight size={16} color={Colors.neutral[300]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/technician/performance')} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.success[50] }]}>
              <TrendingUp size={20} color={Colors.success[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Performance</Text>
            <ChevronRight size={16} color={Colors.neutral[300]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/technician/payouts')} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.accent[50] }]}>
              <Wallet size={20} color={Colors.accent[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Payouts</Text>
            <ChevronRight size={16} color={Colors.neutral[300]} />
          </TouchableOpacity>
        </View>

        {/* Active Bookings */}
        <Text style={styles.sectionTitle}>Aaj Ke Kaam</Text>
        {activeBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>Abhi koi active booking nahi</Text>
          </View>
        ) : (
          activeBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.customerInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {booking.customer_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{booking.customer_name}</Text>
                    <Text style={styles.serviceName}>{booking.service_name}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColors[booking.status] || Colors.neutral[400]}20` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColors[booking.status] || Colors.neutral[600] }]}>
                    {statusLabels[booking.status] || booking.status}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Phone size={14} color={Colors.neutral[400]} />
                <Text style={styles.detailText}>{booking.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={14} color={Colors.neutral[400]} />
                <Text style={styles.detailText} numberOfLines={2}>{booking.address}</Text>
              </View>
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => {
                  const addr = encodeURIComponent(booking.address);
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
                  }
                }}
                activeOpacity={0.7}
              >
                <Navigation size={14} color={Colors.primary[700]} />
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </TouchableOpacity>
              <View style={styles.detailRow}>
                <Package size={14} color={Colors.neutral[400]} />
                <Text style={styles.detailText}>{booking.package_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Calendar size={14} color={Colors.neutral[400]} />
                <Text style={styles.detailText}>{booking.scheduled_date} at {booking.scheduled_time}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.amountRow}>
                  <IndianRupee size={16} color={Colors.primary[700]} />
                  <Text style={styles.amountText}>{booking.total_amount}</Text>
                </View>
                {updatingId === booking.id ? (
                  <ActivityIndicator size="small" color={Colors.primary[600]} />
                ) : (
                  <View style={styles.statusActions}>
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: Colors.primary[50] }]}
                        onPress={() => updateStatus(booking.id, 'confirmed')}
                      >
                        <Text style={[styles.statusBtnText, { color: Colors.primary[700] }]}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: Colors.accent[50] }]}
                        onPress={() => updateStatus(booking.id, 'in_progress')}
                      >
                        <Play size={12} color={Colors.accent[600]} />
                        <Text style={[styles.statusBtnText, { color: Colors.accent[600] }]}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'in_progress' && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: Colors.success[50] }]}
                        onPress={() => updateStatus(booking.id, 'completed')}
                      >
                        <CheckCircle2 size={12} color={Colors.success[700]} />
                        <Text style={[styles.statusBtnText, { color: Colors.success[700] }]}>Done</Text>
                      </TouchableOpacity>
                    )}
                    {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: Colors.error[50] }]}
                        onPress={() => updateStatus(booking.id, 'cancelled')}
                      >
                        <XCircle size={12} color={Colors.error[600]} />
                        <Text style={[styles.statusBtnText, { color: Colors.error[600] }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {/* Completed Bookings */}
        {completedBookings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Pura Ho Gaye Kaam</Text>
            {completedBookings.map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, { opacity: 0.7 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.customerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {booking.customer_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{booking.customer_name}</Text>
                      <Text style={styles.serviceName}>{booking.service_name}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${Colors.success[600]}20` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: Colors.success[600] }]}>Done</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.amountRow}>
                    <IndianRupee size={16} color={Colors.primary[700]} />
                    <Text style={styles.amountText}>{booking.total_amount}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {showLogoutConfirm && (
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <LogOut size={32} color={Colors.error[500]} />
            <Text style={styles.logoutModalTitle}>Log Out</Text>
            <Text style={styles.logoutModalText}>
              Kya aap really log out karna chahte hain?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={confirmLogout}>
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showPinChange && (
        <View style={styles.logoutOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'web' ? undefined : 'padding'}
            style={styles.pinModalWrap}
          >
            <View style={styles.pinModal}>
              {pinSuccess ? (
                <>
                  <CheckCircle2 size={40} color={Colors.success[600]} />
                  <Text style={styles.pinModalTitle}>PIN Change Ho Gaya!</Text>
                  <Text style={styles.pinModalText}>Aapka naya PIN set ho gaya hai.</Text>
                </>
              ) : (
                <>
                  <View style={styles.pinModalIcon}>
                    <KeyRound size={28} color={Colors.neutral[0]} />
                  </View>
                  <Text style={styles.pinModalTitle}>PIN Badlein</Text>
                  <Text style={styles.pinModalText}>
                    Apna purana PIN daalein aur naya PIN set karein
                  </Text>

                  <View style={styles.pinInputWrap}>
                    <Lock size={18} color={Colors.neutral[400]} />
                    <TextInput
                      style={styles.pinInput}
                      placeholder="Purana PIN"
                      placeholderTextColor={Colors.neutral[400]}
                      value={oldPin}
                      onChangeText={setOldPin}
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <View style={styles.pinInputWrap}>
                    <KeyRound size={18} color={Colors.neutral[400]} />
                    <TextInput
                      style={styles.pinInput}
                      placeholder="Naya PIN (4-6 digit)"
                      placeholderTextColor={Colors.neutral[400]}
                      value={newPin}
                      onChangeText={setNewPin}
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <View style={styles.pinInputWrap}>
                    <CheckCircle2 size={18} color={Colors.neutral[400]} />
                    <TextInput
                      style={styles.pinInput}
                      placeholder="Naya PIN Confirm"
                      placeholderTextColor={Colors.neutral[400]}
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      secureTextEntry
                      keyboardType="numeric"
                      maxLength={6}
                      onSubmitEditing={handleChangePin}
                    />
                  </View>

                  {pinError && (
                    <View style={styles.pinErrorWrap}>
                      <AlertCircle size={14} color={Colors.error[600]} />
                      <Text style={styles.pinErrorText}>{pinError}</Text>
                    </View>
                  )}

                  <View style={styles.logoutModalButtons}>
                    <TouchableOpacity style={styles.logoutCancelBtn} onPress={closePinModal}>
                      <Text style={styles.logoutCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pinChangeConfirmBtn}
                      onPress={handleChangePin}
                      disabled={pinLoading}
                    >
                      {pinLoading ? (
                        <ActivityIndicator size="small" color={Colors.neutral[0]} />
                      ) : (
                        <Text style={styles.logoutConfirmText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
  },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  pinChangeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.neutral[500], marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: 14, color: Colors.neutral[400] },
  bookingCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary[700] },
  customerName: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  serviceName: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  statusBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText: { fontSize: 13, color: Colors.neutral[600], flex: 1 },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  navigateBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary[700] },
  quickActionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickActionCard: { flex: 1, backgroundColor: Colors.neutral[0], borderRadius: Radius.md, padding: Spacing.sm + 2, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.neutral[200] },
  quickActionIcon: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: Colors.neutral[700], textAlign: 'center' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  amountText: { fontSize: 20, fontWeight: '700', color: Colors.primary[700] },
  statusActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
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
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
    gap: Spacing.sm,
  },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  logoutModalText: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.sm },
  logoutModalButtons: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
  },
  logoutCancelText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.error[500],
    alignItems: 'center',
  },
  logoutConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
  pinModalWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  pinModal: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '90%',
    maxWidth: 360,
    gap: Spacing.sm,
  },
  pinModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  pinModalTitle: { fontSize: 20, fontWeight: '700', color: Colors.neutral[900] },
  pinModalText: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.sm },
  pinInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    width: '100%',
    gap: Spacing.sm,
  },
  pinInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  pinErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  pinErrorText: {
    fontSize: 13,
    color: Colors.error[600],
    fontWeight: '600',
    flex: 1,
  },
  pinChangeConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
  },
});
