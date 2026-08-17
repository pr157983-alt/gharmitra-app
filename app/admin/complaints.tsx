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
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Send,
} from 'lucide-react-native';
import { supabase, Complaint } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  open: { color: Colors.warning[500], icon: AlertCircle, label: 'Open' },
  in_progress: { color: Colors.primary[600], icon: Clock, label: 'In Progress' },
  resolved: { color: Colors.success[600], icon: CheckCircle2, label: 'Resolved' },
  closed: { color: Colors.neutral[400], icon: XCircle, label: 'Closed' },
};

const allStatuses = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminComplaintsScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [filterModal, setFilterModal] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [detailModal, setDetailModal] = useState<Complaint | null>(null);
  const [responseText, setResponseText] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('admin_logged_in') !== 'true') {
        router.replace('/admin/login');
        return;
      }
      setRole(sessionStorage.getItem('admin_role') as 'super' | 'viewer' || 'super');
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter) {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setComplaints(data || []);
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadComplaints();
  }, [loadComplaints]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadComplaints();
  }, [loadComplaints]);

  const updateComplaintStatus = async (id: string, newStatus: string, response?: string) => {
    if (role === 'viewer') return;
    setUpdating(true);

    const update: { status: string; admin_response?: string; resolved_at?: string | null } = {
      status: newStatus,
    };

    if (response !== undefined) {
      update.admin_response = response;
    }

    if (newStatus === 'resolved' || newStatus === 'closed') {
      update.resolved_at = new Date().toISOString();
    } else {
      update.resolved_at = null;
    }

    const { error } = await supabase
      .from('complaints')
      .update(update)
      .eq('id', id);

    setUpdating(false);

    if (error) {
      Alert.alert('Error', 'Update nahi hua. Phir try karein.');
      return;
    }

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...update, resolved_at: update.resolved_at ?? c.resolved_at }
          : c
      )
    );
    setDetailModal(null);
    setResponseText('');
  };

  const openDetail = (c: Complaint) => {
    setResponseText(c.admin_response || '');
    setDetailModal(c);
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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Complaints</Text>
            <Text style={styles.headerSubtitle}>
              {complaints.length} {filter ? `${filter} ` : ''}tickets
            </Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModal(true)}>
            <Filter size={16} color={Colors.neutral[700]} />
            <Text style={styles.filterText}>{filter ? 'On' : 'Filter'}</Text>
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
              {filter ? `No ${filter} complaints` : 'Customer complaints will appear here'}
            </Text>
          </View>
        ) : (
          complaints.map((c) => {
            const cfg = statusConfig[c.status] || statusConfig.open;
            const StatusIcon = cfg.icon;
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.complaintCard}
                onPress={() => openDetail(c)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject} numberOfLines={2}>{c.subject}</Text>
                    <Text style={styles.customerName}>{c.customer_name} · {c.phone}</Text>
                    {c.service_name && <Text style={styles.serviceName}>{c.service_name}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
                    <StatusIcon size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>{c.description}</Text>

                {c.admin_response && (
                  <View style={styles.responseBadge}>
                    <CheckCircle2 size={12} color={Colors.primary[600]} />
                    <Text style={styles.responseBadgeText}>Admin responded</Text>
                  </View>
                )}

                <Text style={styles.dateText}>
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            <TouchableOpacity
              style={[styles.filterOption, !filter && styles.filterOptionActive]}
              onPress={() => { setFilter(null); setFilterModal(false); }}
            >
              <Text style={[styles.filterOptionText, !filter && styles.filterOptionTextActive]}>All Complaints</Text>
            </TouchableOpacity>
            {allStatuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterOption, filter === s && styles.filterOptionActive]}
                onPress={() => { setFilter(s); setFilterModal(false); }}
              >
                <Text style={[styles.filterOptionText, filter === s && styles.filterOptionTextActive]}>
                  {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Detail / Response Modal */}
      <Modal visible={!!detailModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDetailModal(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {detailModal && (
              <>
                <Text style={styles.modalTitle}>{detailModal.subject}</Text>
                <Text style={styles.detailCustomer}>
                  {detailModal.customer_name} · {detailModal.phone}
                </Text>
                {detailModal.service_name && (
                  <Text style={styles.detailService}>{detailModal.service_name}</Text>
                )}
                <Text style={styles.detailDescription}>{detailModal.description}</Text>

                {role === 'super' && (
                  <>
                    <Text style={styles.fieldLabel}>Admin Response</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Customer ko response likhein..."
                      placeholderTextColor={Colors.neutral[400]}
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    <View style={styles.statusActions}>
                      {detailModal.status !== 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.statusBtn, { backgroundColor: Colors.primary[50] }]}
                          onPress={() => updateComplaintStatus(detailModal.id, 'in_progress', responseText)}
                          disabled={updating}
                        >
                          <Text style={[styles.statusBtnText, { color: Colors.primary[700] }]}>In Progress</Text>
                        </TouchableOpacity>
                      )}
                      {detailModal.status !== 'resolved' && (
                        <TouchableOpacity
                          style={[styles.statusBtn, { backgroundColor: Colors.success[50] }]}
                          onPress={() => updateComplaintStatus(detailModal.id, 'resolved', responseText)}
                          disabled={updating}
                        >
                          <Text style={[styles.statusBtnText, { color: Colors.success[700] }]}>Resolve</Text>
                        </TouchableOpacity>
                      )}
                      {detailModal.status !== 'closed' && (
                        <TouchableOpacity
                          style={[styles.statusBtn, { backgroundColor: Colors.neutral[100] }]}
                          onPress={() => updateComplaintStatus(detailModal.id, 'closed', responseText)}
                          disabled={updating}
                        >
                          <Text style={[styles.statusBtnText, { color: Colors.neutral[700] }]}>Close</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {updating && <ActivityIndicator size="small" color={Colors.primary[600]} style={{ marginTop: Spacing.sm }} />}
                  </>
                )}

                {role === 'viewer' && detailModal.admin_response && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Admin Response:</Text>
                    <Text style={styles.responseText}>{detailModal.admin_response}</Text>
                  </View>
                )}

                {role === 'viewer' && !detailModal.admin_response && (
                  <Text style={styles.readOnlyText}>Read-only access. No response yet.</Text>
                )}
              </>
            )}
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
  filterButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[700], marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center' },
  complaintCard: {
    backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral[200], gap: Spacing.xs,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  subject: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  customerName: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  serviceName: { fontSize: 12, color: Colors.primary[600], marginTop: 2, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4, borderRadius: Radius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 13, color: Colors.neutral[600], lineHeight: 20 },
  responseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  responseBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary[600] },
  dateText: { fontSize: 11, color: Colors.neutral[400] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.lg, width: '85%', maxWidth: 400, gap: Spacing.xs },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900], marginBottom: Spacing.xs },
  filterOption: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
  filterOptionActive: { backgroundColor: Colors.primary[50] },
  filterOptionText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700], textTransform: 'capitalize' },
  filterOptionTextActive: { color: Colors.primary[700] },
  detailCustomer: { fontSize: 13, color: Colors.neutral[500] },
  detailService: { fontSize: 12, color: Colors.primary[600], fontWeight: '600', marginTop: 2 },
  detailDescription: { fontSize: 14, color: Colors.neutral[700], lineHeight: 20, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.neutral[600], marginTop: Spacing.sm },
  textInput: {
    backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2, borderWidth: 1, borderColor: Colors.neutral[200],
    fontSize: 14, color: Colors.neutral[900],
  },
  textArea: { minHeight: 60 },
  statusActions: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 8, borderRadius: Radius.sm },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
  responseBox: { backgroundColor: Colors.primary[50], borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  responseLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary[700] },
  responseText: { fontSize: 13, color: Colors.neutral[700], marginTop: 2 },
  readOnlyText: { fontSize: 13, color: Colors.neutral[400], fontStyle: 'italic', marginTop: Spacing.sm },
});
