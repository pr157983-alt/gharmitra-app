import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { supabase, Booking, TechnicianLocation } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { parseJobMeta, paymentLabel, jobBillTotals } from '@/lib/jobMeta';

const statusColors: Record<string, string> = {
  pending: Colors.warning[500],
  confirmed: Colors.primary[600],
  in_progress: Colors.accent[500],
  completed: Colors.success[600],
  cancelled: Colors.error[500],
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [techLocation, setTechLocation] = useState<TechnicianLocation | null>(null);

  const loadBooking = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
      setBooking(data);
    } catch {
      // network error
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadBooking();
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, [loadBooking]);

  // Subscribe to technician live location when booking is in_progress
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`technician_location_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_locations',
          filter: `booking_id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            setTechLocation(payload.new as TechnicianLocation);
          } else if (payload.eventType === 'DELETE') {
            setTechLocation(null);
          }
        }
      )
      .subscribe();

    // Also fetch initial location
    supabase
      .from('technician_locations')
      .select('*')
      .eq('booking_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTechLocation(data as TechnicianLocation);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
          loadBooking();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
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
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: `${statusColors[booking.status] || Colors.neutral[400]}15` }]}>
          {booking.status === 'cancelled' ? (
            <XCircle size={32} color={Colors.error[500]} />
          ) : (
            <CheckCircle2 size={32} color={statusColors[booking.status] || Colors.neutral[400]} />
          )}
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: statusColors[booking.status] || Colors.neutral[600] }]}>
              {booking.status === 'confirmed' && 'Booking Confirmed!'}
              {booking.status === 'pending' && 'Booking Pending'}
              {booking.status === 'in_progress' && 'Work In Progress'}
              {booking.status === 'completed' && 'Service Completed'}
              {booking.status === 'cancelled' && 'Booking Cancelled'}
            </Text>
            <Text style={styles.statusSub}>
              {booking.status === 'confirmed' && 'Our professional will arrive at the scheduled time'}
              {booking.status === 'pending' && 'Waiting for confirmation'}
              {booking.status === 'in_progress' && 'Technician is working on your service'}
              {booking.status === 'completed' && 'Thank you for using our service'}
              {booking.status === 'cancelled' && 'This booking has been cancelled'}
            </Text>
          </View>
        </View>

        {booking.status === 'completed' && (
          <View>
            <View style={styles.jobHead}>
              <Text style={styles.jobHeadItem}>Job ID: {booking.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.jobHeadItem}>Service: {booking.service_name}</Text>
              <Text style={styles.jobHeadItem}>Status: Completed</Text>
            </View>
            <Text style={styles.cardTitle}>Service Proof (Proof of work)</Text>
            <View style={styles.proofRow}>
              <View style={styles.proofBox}>
                <Text style={styles.proofLabel}>Before Repair</Text>
                {parseJobMeta(booking.notes).meta.before_photo_url ? (
                  <Image source={{ uri: parseJobMeta(booking.notes).meta.before_photo_url }} style={styles.proofImg} />
                ) : (
                  <Text style={styles.statusSub}>Photo jaldi upload hogi</Text>
                )}
              </View>
              <View style={styles.proofBox}>
                <Text style={styles.proofLabel}>After Repair</Text>
                {parseJobMeta(booking.notes).meta.after_photo_url ? (
                  <Image source={{ uri: parseJobMeta(booking.notes).meta.after_photo_url }} style={styles.proofImg} />
                ) : (
                  <Text style={styles.statusSub}>Photo jaldi upload hogi</Text>
                )}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parts and Bill</Text>
              {(() => {
                const jm = parseJobMeta(booking.notes).meta;
                const tot = jobBillTotals(Number(booking.total_amount || 0), jm);
                return (
                  <>
                    <Text style={styles.detailValue}>
                      {tot.inspection ? 'Visiting fee' : 'Service charge'}: ₹{tot.service}
                    </Text>
                    {tot.addonLines.map((a) => (
                      <Text key={a.id} style={styles.detailValue}>
                        Add-on {a.name}: ₹{a.price}
                      </Text>
                    ))}
                    {tot.location > 0 ? (
                      <Text style={styles.detailValue}>
                        Location extra: ₹{tot.location}
                        {jm.location_label ? ` (${jm.location_label})` : ''}
                      </Text>
                    ) : null}
                    {tot.surge > 0 ? (
                      <Text style={styles.detailValue}>
                        Peak / surge: ₹{tot.surge}
                        {jm.surge_label ? ` (${jm.surge_label})` : ''}
                      </Text>
                    ) : null}
                    <Text style={styles.detailValue}>
                      Replaced Part: ₹{tot.parts}
                      {jm.parts_name ? ` (${jm.parts_name})` : ''}
                    </Text>
                    <Text style={styles.detailValueBold}>
                      Total: ₹{tot.total} · {paymentLabel(jm.payment_status)}
                    </Text>
                    {jm.warranty_until ? (
                      <Text style={styles.statusSub}>30-day warranty till {jm.warranty_until}</Text>
                    ) : null}
                    {jm.is_free_visit ? <Text style={styles.statusSub}>Warranty free visit booked</Text> : null}
                  </>
                );
              })()}
            </View>
          </View>
        )}

        {/* Service info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.service_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package</Text>
            <Text style={styles.detailValue}>{booking.package_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValueBold}>₹{booking.total_amount}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <View style={styles.iconRow}>
            <Calendar size={18} color={Colors.primary[600]} />
            <View>
              <Text style={styles.iconLabel}>Date</Text>
              <Text style={styles.iconValue}>{booking.scheduled_date}</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <Clock size={18} color={Colors.primary[600]} />
            <View>
              <Text style={styles.iconLabel}>Time</Text>
              <Text style={styles.iconValue}>{booking.scheduled_time}</Text>
            </View>
          </View>
        </View>

        {/* Customer info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <View style={styles.iconRow}>
            <User size={18} color={Colors.neutral[400]} />
            <View>
              <Text style={styles.iconLabel}>Name</Text>
              <Text style={styles.iconValue}>{booking.customer_name}</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <Phone size={18} color={Colors.neutral[400]} />
            <View>
              <Text style={styles.iconLabel}>Phone</Text>
              <Text style={styles.iconValue}>{booking.phone}</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <MapPin size={18} color={Colors.neutral[400]} />
            <View>
              <Text style={styles.iconLabel}>Address</Text>
              <Text style={styles.iconValue}>{booking.address}</Text>
            </View>
          </View>
          {parseJobMeta(booking.notes).userNotes ? (
            <View style={styles.iconRow}>
              <FileText size={18} color={Colors.neutral[400]} />
              <View>
                <Text style={styles.iconLabel}>Notes</Text>
                <Text style={styles.iconValue}>{parseJobMeta(booking.notes).userNotes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Live location tracking */}
        {booking.status === 'in_progress' && (
          <LiveLocationCard location={techLocation} />
        )}

        {/* Booking ID */}
        <View style={styles.bookingIdRow}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingIdValue}>{booking.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Actions */}
        {(booking.status === 'confirmed' || booking.status === 'pending') && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
            <XCircle size={18} color={Colors.error[600]} />
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: Colors.neutral[500],
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSub: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  jobHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  jobHeadItem: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  proofRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  proofBox: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  proofLabel: { fontWeight: '700', marginBottom: 8, color: Colors.neutral[800] },
  proofImg: { width: '100%', height: 140, borderRadius: 8, backgroundColor: Colors.neutral[100] },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
  },
  iconLabel: {
    fontSize: 11,
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  iconValue: {
    fontSize: 14,
    color: Colors.neutral[800],
    marginTop: 2,
  },
  bookingIdRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  bookingIdLabel: {
    fontSize: 13,
    color: Colors.neutral[400],
  },
  bookingIdValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral[600],
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.error[50],
    borderWidth: 1,
    borderColor: Colors.error[100],
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error[600],
  },
  liveCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent[200],
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  liveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
    flex: 1,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success[500],
  },
  liveMapPlaceholder: {
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  liveMapText: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
  liveCoords: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  liveCoordItem: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm,
  },
  liveCoordLabel: {
    fontSize: 10,
    color: Colors.neutral[400],
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  liveCoordValue: {
    fontSize: 13,
    color: Colors.neutral[800],
    fontWeight: '600',
    marginTop: 2,
  },
  liveWaitingText: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});

function LiveLocationCard({ location }: { location: TechnicianLocation | null }) {
  const mapUrl = location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`
    : null;

  return (
    <View style={styles.liveCard}>
      <View style={styles.liveHeader}>
        <View style={styles.livePulse} />
        <Text style={styles.liveTitle}>Technician Live Location</Text>
      </View>

      {mapUrl ? (
        <>
          <View style={styles.liveMapPlaceholder}>
            <iframe
              src={mapUrl}
              style={{ width: '100%', height: '100%', border: 0 }}
              loading="lazy"
              title="Technician location"
            />
          </View>
          <View style={styles.liveCoords}>
            <View style={styles.liveCoordItem}>
              <Text style={styles.liveCoordLabel}>Latitude</Text>
              <Text style={styles.liveCoordValue}>{location!.lat.toFixed(5)}</Text>
            </View>
            <View style={styles.liveCoordItem}>
              <Text style={styles.liveCoordLabel}>Longitude</Text>
              <Text style={styles.liveCoordValue}>{location!.lng.toFixed(5)}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.liveWaitingText}>
          Technician is starting location sharing...
        </Text>
      )}
    </View>
  );
}
