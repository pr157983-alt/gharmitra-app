import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Calendar, Clock, User, Phone, MapPin, FileText, AlertCircle, CheckCircle2, Home, LogIn } from 'lucide-react-native';
import { supabase, Service, ServicePackage, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { isBlacklisted } from '@/lib/customerSegment';

type FormError = { title: string; message: string } | null;

const timeSlots = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
];

function getNextDays(count: number) {
  const days: { date: string; day: string; dateNum: string; fullDate: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: String(d.getDate()),
      fullDate: d.toISOString().split('T')[0],
    });
  }
  return days;
}

export default function NewBookingScreen() {
  const { service, package: pkgId } = useLocalSearchParams<{ service: string; package: string }>();
  const [serviceData, setServiceData] = useState<Service | null>(null);
  const [packageData, setPackageData] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formError, setFormError] = useState<FormError>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(false);
  const [bookedBooking, setBookedBooking] = useState<Booking | null>(null);

  const days = getNextDays(14);

  const loadData = useCallback(async () => {
    if (!service || !pkgId) {
      setLoading(false);
      return;
    }
    try {
      const [svcRes, pkgRes] = await Promise.all([
        supabase.from('services').select('*').eq('id', service).maybeSingle(),
        supabase.from('service_packages').select('*').eq('id', pkgId).maybeSingle(),
      ]);
      if (svcRes.data) setServiceData(svcRes.data);
      if (pkgRes.data) setPackageData(pkgRes.data);
    } catch {
      // network error
    }
    setLoading(false);
  }, [service, pkgId]);

  useEffect(() => {
    loadData();
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cid = sessionStorage.getItem('customer_id');
      const cname = sessionStorage.getItem('customer_name');
      const cphone = sessionStorage.getItem('customer_phone');
      if (cid) {
        setIsLoggedIn(true);
        if (cname) setName(cname);
        if (cphone) setPhone(cphone);
      } else {
        setIsLoggedIn(false);
      }
    }
  }, []);

  const checkExistingBooking = useCallback(async (phoneNum: string, serviceId: string) => {
    if (phoneNum.trim().length < 10 || !serviceId) {
      setExistingBooking(null);
      return;
    }
    setCheckingBooking(true);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('phone', phoneNum.trim())
        .eq('service_id', serviceId)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingBooking(data as Booking | null);
    } catch {
      setExistingBooking(null);
    }
    setCheckingBooking(false);
  }, []);

  useEffect(() => {
    if (phone.trim().length >= 10 && serviceData) {
      const timeout = setTimeout(() => {
        checkExistingBooking(phone, serviceData.id);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setExistingBooking(null);
    }
  }, [phone, serviceData, checkExistingBooking]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !selectedDate || !selectedTime) {
      setFormError({ title: 'Missing Details', message: 'Please fill in all required fields and select a date & time.' });
      return;
    }
    if (phone.trim().length < 10) {
      setFormError({ title: 'Invalid Phone', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    if (isBlacklisted(phone.trim())) {
      setFormError({
        title: 'Booking blocked',
        message: 'Yeh number blacklist pe hai. Support se contact karein.',
      });
      return;
    }
    if (!serviceData || !packageData) return;

    if (existingBooking) {
      setFormError({
        title: 'Already Booked',
        message: `You already have a ${existingBooking.status} booking for ${existingBooking.service_name} on ${existingBooking.scheduled_date} at ${existingBooking.scheduled_time}. Please check your bookings or cancel the existing one to rebook.`,
      });
      return;
    }

    setSubmitting(true);
    const customerId = typeof window !== 'undefined' ? sessionStorage.getItem('customer_id') : null;
    const { data, error } = await supabase.from('bookings').insert({
      service_id: serviceData.id,
      package_id: packageData.id,
      service_name: serviceData.name,
      package_name: packageData.name,
      customer_name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      scheduled_date: selectedDate,
      scheduled_time: selectedTime,
      status: 'pending',
      total_amount: packageData.price,
      notes: notes.trim() || null,
      customer_id: customerId || null,
    }).select().single();

    setSubmitting(false);

    if (error || !data) {
      setFormError({ title: 'Booking Failed', message: 'Something went wrong. Please try again.' });
      return;
    }

    setBookedBooking(data as Booking);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.loginRequiredContainer}>
        <View style={styles.loginRequiredIconWrap}>
          <LogIn size={40} color={Colors.neutral[0]} />
        </View>
        <Text style={styles.loginRequiredTitle}>Login Required</Text>
        <Text style={styles.loginRequiredText}>
          Booking karne ke liye pehle login karein. Apne mobile number aur password se login karke apni bookings dekh sakte hain.
        </Text>
        <TouchableOpacity
          style={styles.loginRequiredBtn}
          onPress={() => router.push('/customer/login')}
          activeOpacity={0.8}
        >
          <LogIn size={18} color={Colors.neutral[0]} />
          <Text style={styles.loginRequiredBtnText}>Login / Register</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginRequiredBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.loginRequiredBackText}>Wapas jayein</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (bookedBooking) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={64} color={Colors.neutral[0]} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Aapki booking successfully ho gayi hai. Hamari team aapse jald contact karegi.
          </Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Booking ID</Text>
              <Text style={styles.successRowValue}>#{bookedBooking.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Service</Text>
              <Text style={styles.successRowValue}>{bookedBooking.service_name}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Package</Text>
              <Text style={styles.successRowValue}>{bookedBooking.package_name}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Date</Text>
              <Text style={styles.successRowValue}>{bookedBooking.scheduled_date}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Time</Text>
              <Text style={styles.successRowValue}>{bookedBooking.scheduled_time}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Amount</Text>
              <Text style={styles.successRowValue}>₹{bookedBooking.total_amount}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Name</Text>
              <Text style={styles.successRowValue}>{bookedBooking.customer_name}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successRowLabel}>Phone</Text>
              <Text style={styles.successRowValue}>{bookedBooking.phone}</Text>
            </View>
          </View>

          <View style={styles.successStatusRow}>
            <View style={[styles.statusPill, { backgroundColor: Colors.warning[50] }]}>
              <Clock size={12} color={Colors.warning[600]} />
              <Text style={[styles.statusPillText, { color: Colors.warning[600] }]}>Status: Pending</Text>
            </View>
            <Text style={styles.successNoteText}>Admin confirm karte hi status update hoga</Text>
          </View>
        </View>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.successPrimaryBtn}
            onPress={() => router.replace('/(tabs)/bookings')}
            activeOpacity={0.8}
          >
            <Text style={styles.successPrimaryBtnText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.successSecondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Home size={16} color={Colors.primary[700]} />
            <Text style={styles.successSecondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Service</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        {serviceData && packageData && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{serviceData.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Package</Text>
              <Text style={styles.summaryValue}>{packageData.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{packageData.duration}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotal}>₹{packageData.price}</Text>
            </View>
          </View>
        )}

        {/* Contact details */}
        <Text style={styles.sectionTitle}>Contact Details</Text>
        {checkingBooking && (
          <View style={styles.checkingRow}>
            <ActivityIndicator size="small" color={Colors.primary[600]} />
            <Text style={styles.checkingText}>Checking existing bookings...</Text>
          </View>
        )}
        {existingBooking && (
          <View style={styles.existingBookingCard}>
            <View style={styles.existingBookingHeader}>
              <AlertCircle size={18} color={Colors.warning[600]} />
              <Text style={styles.existingBookingTitle}>Already Booked!</Text>
            </View>
            <Text style={styles.existingBookingText}>
              You have a {existingBooking.status} booking for {existingBooking.service_name} on {existingBooking.scheduled_date} at {existingBooking.scheduled_time}.
            </Text>
            <TouchableOpacity
              style={styles.viewBookingsBtn}
              onPress={() => router.replace('/(tabs)/bookings')}
            >
              <Text style={styles.viewBookingsBtnText}>View My Bookings</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <User size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor={Colors.neutral[400]}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Phone size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor={Colors.neutral[400]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <MapPin size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Full Address *"
              placeholderTextColor={Colors.neutral[400]}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Date selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {days.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[styles.dateCard, selectedDate === d.fullDate && styles.dateCardSelected]}
              onPress={() => setSelectedDate(d.fullDate)}
            >
              <Text style={[styles.dateDay, selectedDate === d.fullDate && styles.dateTextSelected]}>
                {d.day}
              </Text>
              <Text style={[styles.dateNum, selectedDate === d.fullDate && styles.dateTextSelected]}>
                {d.dateNum}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time selection */}
        <Text style={styles.sectionTitle}>Select Time Slot</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[styles.timeChip, selectedTime === slot && styles.timeChipSelected]}
              onPress={() => setSelectedTime(slot)}
            >
              <Text style={[styles.timeText, selectedTime === slot && styles.timeTextSelected]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <FileText size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Any special instructions..."
              placeholderTextColor={Colors.neutral[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Total Amount</Text>
          <Text style={styles.bottomPrice}>₹{packageData?.price || 0}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, (submitting || !!existingBooking) && styles.confirmButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !!existingBooking}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : existingBooking ? (
            <>
              <AlertCircle size={18} color={Colors.neutral[0]} />
              <Text style={styles.confirmText}>Already Booked</Text>
            </>
          ) : (
            <>
              <Check size={18} color={Colors.neutral[0]} />
              <Text style={styles.confirmText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {formError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorModal}>
            <View style={styles.errorIconWrap}>
              <AlertCircle size={28} color={Colors.error[500]} />
            </View>
            <Text style={styles.errorModalTitle}>{formError.title}</Text>
            <Text style={styles.errorModalText}>{formError.message}</Text>
            <TouchableOpacity
              style={styles.errorModalBtn}
              onPress={() => setFormError(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.errorModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
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
  successContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  successIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  successRowLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  successRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  successDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginVertical: Spacing.xs,
  },
  successStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  successNoteText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  successActions: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  successPrimaryBtn: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  successSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  successSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.primary[100],
    marginVertical: Spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[700],
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  inputCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[900],
    paddingVertical: Spacing.xs + 2,
  },
  inputDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginVertical: Spacing.xs,
  },
  dateScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  dateCard: {
    width: 60,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[600],
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[500],
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginTop: 2,
  },
  dateTextSelected: {
    color: Colors.neutral[0],
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  timeChipSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  timeTextSelected: {
    color: Colors.primary[700],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingBottom: Spacing.md + (Platform.OS === 'ios' ? 24 : 0),
  },
  bottomLabel: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    gap: Spacing.xs + 2,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.neutral[400],
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  checkingText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  existingBookingCard: {
    backgroundColor: Colors.warning[50],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning[100],
  },
  existingBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  existingBookingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warning[600],
  },
  existingBookingText: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  viewBookingsBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning[600],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  viewBookingsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  loginRequiredContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loginRequiredIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary[600], justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  loginRequiredTitle: {
    fontSize: 22, fontWeight: '700', color: Colors.neutral[900],
  },
  loginRequiredText: {
    fontSize: 14, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20,
    marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  loginRequiredBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  loginRequiredBtnText: {
    fontSize: 16, fontWeight: '700', color: Colors.neutral[0],
  },
  loginRequiredBackBtn: {
    marginTop: Spacing.md, paddingVertical: Spacing.sm,
  },
  loginRequiredBackText: {
    fontSize: 14, color: Colors.neutral[400], fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 200,
  },
  errorModal: {
    backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.xl,
    width: '85%', maxWidth: 360, alignItems: 'center',
  },
  errorIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.error[50],
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  errorModalTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.neutral[900],
  },
  errorModalText: {
    fontSize: 14, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20, marginTop: Spacing.xs,
  },
  errorModalBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl, borderRadius: Radius.md,
  },
  errorModalBtnText: {
    fontSize: 15, fontWeight: '700', color: Colors.neutral[0],
  },
});
