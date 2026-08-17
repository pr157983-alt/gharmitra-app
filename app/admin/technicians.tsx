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
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Wrench,
  Plus,
  Trash2,
  Pencil,
  Phone,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
} from 'lucide-react-native';
import { supabase, Technician } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function AdminTechniciansScreen() {
  const params = useLocalSearchParams<{ active?: string; add?: string }>();
  const addOpened = useRef(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [skills, setSkills] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('technicians')
        .select('*')
        .order('created_at', { ascending: false });
      setTechnicians(data || []);
    } catch {
      // network error
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRole(sessionStorage.getItem('admin_role') as 'super' | 'viewer' || 'super');
    }
  }, []);

  useEffect(() => {
    if (!addOpened.current && params.add === '1' && role === 'super') {
      addOpened.current = true;
      openAdd();
    }
  }, [params.add, role]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPin('1234');
    setSkills('');
    setModalVisible(true);
  };

  const openEdit = (tech: Technician) => {
    setEditingId(tech.id);
    setName(tech.name);
    setPhone(tech.phone);
    setPin(tech.pin);
    setSkills(tech.skills);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      setFormError('Naam aur phone zaroori hai.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      pin: pin.trim() || '1234',
      skills: skills.trim(),
    };
    if (editingId) {
      await supabase.from('technicians').update(payload).eq('id', editingId);
    } else {
      await supabase.from('technicians').insert(payload);
    }
    setSaving(false);
    setModalVisible(false);
    loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('technicians').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    loadData();
  };

  const handleDelete = (tech: Technician) => {
    setDeleteTarget(tech);
  };

  const toggleActive = async (tech: Technician) => {
    await supabase
      .from('technicians')
      .update({ is_active: !tech.is_active })
      .eq('id', tech.id);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  const visible = params.active === '1' ? technicians.filter((t) => t.is_active) : technicians;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Technicians</Text>
            <Text style={styles.headerSubtitle}>
              {visible.length} technicians · {technicians.filter((t) => t.is_active).length} active
              {params.active === '1' ? ' · active only' : ''}
            </Text>
          </View>
          {role === 'super' && (
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Plus size={16} color={Colors.primary[700]} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

    <ScrollView
      contentContainerStyle={styles.listContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {visible.length === 0 ? (
        <Text style={styles.emptyText}>Koi technician nahi. {role === 'viewer' ? '' : 'Add karein.'}</Text>
      ) : (
        visible.map((tech) => (
          <View key={tech.id} style={styles.itemCard}>
            <View style={styles.itemLeft}>
              <View style={[styles.techAvatar, { backgroundColor: tech.is_active ? Colors.primary[100] : Colors.neutral[100] }]}>
                <Wrench size={18} color={tech.is_active ? Colors.primary[700] : Colors.neutral[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.itemName}>{tech.name}</Text>
                  {tech.is_active ? (
                    <View style={[styles.badge, { backgroundColor: Colors.success[50] }]}>
                      <CheckCircle2 size={10} color={Colors.success[600]} />
                      <Text style={[styles.badgeText, { color: Colors.success[600] }]}>Active</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: Colors.neutral[100] }]}>
                      <XCircle size={10} color={Colors.neutral[500]} />
                      <Text style={[styles.badgeText, { color: Colors.neutral[500] }]}>Inactive</Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Phone size={12} color={Colors.neutral[400]} />
                  <Text style={styles.itemMeta}>{tech.phone}</Text>
                </View>
                {tech.skills ? (
                  <Text style={styles.skillsText}>Skills: {tech.skills}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.itemActions}>
              {role === 'super' ? (
                <>
                  <Switch
                    value={tech.is_active}
                    onValueChange={() => toggleActive(tech)}
                    trackColor={{ false: Colors.neutral[300], true: Colors.success[500] }}
                  />
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(tech)}>
                    <Pencil size={16} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(tech)}>
                    <Trash2 size={16} color={Colors.error[500]} />
                  </TouchableOpacity>
                </>
              ) : (
                <Eye size={16} color={Colors.neutral[300]} />
              )}
            </View>
          </View>
        ))
      )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={role === 'super' && modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Technician' : 'Add Technician'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Naam</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Technician ka naam"
              placeholderTextColor={Colors.neutral[400]}
            />

            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="10 digit mobile number"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={styles.inputLabel}>PIN (login ke liye)</Text>
            <TextInput
              style={styles.textInput}
              value={pin}
              onChangeText={setPin}
              placeholder="4-6 digit PIN"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Skills</Text>
            <TextInput
              style={styles.textInput}
              value={skills}
              onChangeText={setSkills}
              placeholder="AC, Fan, Bijli, Plumber..."
              placeholderTextColor={Colors.neutral[400]}
            />

            {formError && (
              <View style={styles.modalErrorWrap}>
                <AlertCircle size={16} color={Colors.error[600]} />
                <Text style={styles.modalErrorText}>{formError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Create'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.deleteIconWrap}>
              <Trash2 size={28} color={Colors.error[500]} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Technician?</Text>
            <Text style={styles.deleteModalText}>
              "{deleteTarget?.name}" ko delete karein? Ye technician ki saari data permanently delete ho jayegi. Ye wapas nahi hoga.
            </Text>
            {deleting ? (
              <ActivityIndicator size="small" color={Colors.error[500]} style={{ marginTop: Spacing.md }} />
            ) : (
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setDeleteTarget(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={confirmDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[0],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary[700] },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[400],
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing.sm,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.neutral[900] },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  itemMeta: { fontSize: 12, color: Colors.neutral[500] },
  skillsText: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    color: Colors.neutral[900],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  saveButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  modalErrorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.error[50], paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: Radius.sm, marginBottom: Spacing.sm,
  },
  modalErrorText: { fontSize: 13, color: Colors.error[600], fontWeight: '600', flex: 1 },
  deleteModalContent: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.error[50],
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deleteModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  deleteModalText: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20, marginTop: Spacing.xs },
  deleteModalButtons: { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.lg },
  deleteCancelBtn: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    backgroundColor: Colors.neutral[100], alignItems: 'center',
  },
  deleteCancelText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  deleteConfirmBtn: {
    flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
    backgroundColor: Colors.error[500], alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
});
