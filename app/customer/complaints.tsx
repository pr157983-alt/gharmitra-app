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
  MessageSquare,
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react-native';
import { supabase, Complaint } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  open: { color: Colors.warning[500], icon: AlertCircle, label: 'Open' },
  in_progress: { color: Colors.primary[600], icon: Clock, label: 'In Progress' },
  resolved: { color: Colors.success[600], icon: CheckCircle2, label: 'Resolved' },
  closed: { color: Colors.neutral[400], icon: XCircle, label: 'Closed' },
};

export default function CustomerComplaintsScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [bookings, setBookings] = useState<{ id: string; service_name: string; scheduled_date: string }[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = sessionStorage.getItem('customer_id');
      if (!id) {
        router.replace('/customer/login');
        return;
      }
      setCustomerId(id);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    if (!customerId) return;
    try {
      const { data } = await supabase
        .from('complaints')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      setComplaints(data || []);
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, [customerId]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const loadBookingsForModal = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('bookings')
      .select('id, service_name, scheduled_date')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setBookings(data || []);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadComplaints();
  }, [loadComplaints]);

  const openFileModal = () => {
    setSubject('');
    setDescription('');
    setSelectedBooking(null);
    setError(null);
    loadBookingsForModal();
    setShowFileModal(true);
  };

  const submitComplaint = async () => {
    if (!customerId) return;
    setError(null);

    if (!subject.trim() || subject.trim().length < 3) {
      setError('Subject kam se kam 3 character ka hona chahiye');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Description kam se kam 10 character ka hona chahiye');
      return;
    }

    setSubmitting(true);

    const customerName = sessionStorage.getItem('customer_name') || '';
    const customerPhone = sessionStorage.getItem('customer_phone') || '';

    let serviceName: string | null = null;
    if (selectedBooking) {
      const bk = bookings.find((b) => b.id === selectedBooking);
      if (bk) serviceName = bk.service_name;
    }

    const { error: insertError } = await supabase.from('complaints').insert({
      customer_id: customerId,
      booking_id: selectedBooking,
      customer_name: customerName,
      phone: customerPhone,
      service_name: serviceName,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
    });

    setSubmitting(false);

    if (insertError) {
      setError('Complaint file nahi ho payi. Phir try karein.');
      return;
    }

    setShowFileModal(false);
    loadComplaints();
  };

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
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Complaints</Text>
            <Text style={styles.headerSubtitle}>{complaints.length} tickets</Text>
          </View>
          <TouchableOpacity style={styles.fileBtn} onPress={openFileModal}>
            <Plus size={18} color={Colors.neutral[0]} />
            <Text style={styles.fileBtnText}>File</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {complaints.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Koi complaint nahi</Text>
            <Text style={styles.emptyText}>
              Koi problem hai? "File" dabake complaint register karein
            </Text>
          </View>
        ) : (
          complaints.map((c) => {
            const cfg = statusConfig[c.status] || statusConfig.open;
            const StatusIcon = cfg.icon;
            return (
              <View key={c.id} style={styles.complaintCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.subject} numberOfLines={2}>{c.subject}</Text>
                    {c.service_name && (
                      <Text style={styles.serviceName}>{c.service_name}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
                    <StatusIcon size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={3}>{c.description}</Text>

                {c.admin_response && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Admin Response:</Text>
                    <Text style={styles.responseText}>{c.admin_response}</Text>
                  </View>
                )}

                <Text style={styles.dateText}>
                  {new Date(c.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Modal visible={showFileModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFileModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Nayi Complaint File Karein</Text>

            <Text style={styles.fieldLabel}>Booking (optional)</Text>
            <View style={styles.bookingsList}>
              <TouchableOpacity
                style={[styles.bookingOption, !selectedBooking && styles.bookingOptionActive]}
                onPress={() => setSelectedBooking(null)}
              >
                <Text style={[styles.bookingOptionText, !selectedBooking && styles.bookingOptionTextActive]}>
                  Koi booking nahi (general complaint)
                </Text>
              </TouchableOpacity>
              {bookings.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bookingOption, selectedBooking === b.id && styles.bookingOptionActive]}
                  onPress={() => setSelectedBooking(b.id)}
                >
                  <Text style={[styles.bookingOptionText, selectedBooking === b.id && styles.bookingOptionTextActive]}>
                    {b.service_name} — {b.scheduled_date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Complaint ka subject"
              placeholderTextColor={Colors.neutral[400]}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Apni problem detail mein likhein"
              placeholderTextColor={Colors.neutral[400]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {error && (
              <View style={styles.errorWrap}>
                <AlertCircle size={14} color={Colors.error[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFileModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitComplaint}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
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
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.sm, borderRadius: Radius.md,
  },
  fileBtnText: { fontSize: 13, fontWeight: '700', color: Colors.neutral[0] },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  complaintCard: {
    backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral[200], gap: Spacing.xs,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  cardLeft: { flex: 1 },
  subject: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  serviceName: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4, borderRadius: Radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 13, color: Colors.neutral[600], lineHeight: 20 },
  responseBox: {
    backgroundColor: Colors.primary[50], borderRadius: Radius.sm, padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  responseLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary[700] },
  responseText: { fontSize: 13, color: Colors.neutral[700], marginTop: 2 },
  dateText: { fontSize: 11, color: Colors.neutral[400], marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.lg, width: '85%', maxWidth: 400, gap: Spacing.xs },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900], marginBottom: Spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.neutral[600], marginTop: Spacing.xs },
  bookingsList: { maxHeight: 150, marginBottom: Spacing.xs },
  bookingOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Spacing.xs },
  bookingOptionActive: { backgroundColor: Colors.primary[50], borderColor: Colors.primary[600] },
  bookingOptionText: { fontSize: 13, color: Colors.neutral[700] },
  bookingOptionTextActive: { color: Colors.primary[700], fontWeight: '600' },
  textInput: {
    backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2, borderWidth: 1, borderColor: Colors.neutral[200],
    fontSize: 14, color: Colors.neutral[900],
  },
  textArea: { minHeight: 80 },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  errorText: { fontSize: 13, color: Colors.error[600], fontWeight: '600', flex: 1 },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  submitBtn: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: Colors.primary[600], alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
});
