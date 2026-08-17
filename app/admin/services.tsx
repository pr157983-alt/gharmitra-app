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
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Wrench,
  Plus,
  Trash2,
  Pencil,
  Tag,
  IndianRupee,
  Star,
  X,
  Eye,
} from 'lucide-react-native';
import { supabase, ServiceCategory, Service } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function AdminServicesScreen() {
  const params = useLocalSearchParams<{ add?: string }>();
  const addOpened = useRef(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<'category' | 'service' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('services').select('*').order('name'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (svcRes.data) setServices(svcRes.data);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const openAddCategory = () => {
    setEditingType('category');
    setEditingId(null);
    setName('');
    setIconName('');
    setImageUrl('');
    setModalVisible(true);
  };

  const openEditCategory = (cat: ServiceCategory) => {
    setEditingType('category');
    setEditingId(cat.id);
    setName(cat.name);
    setIconName(cat.icon_name);
    setImageUrl(cat.image_url || '');
    setModalVisible(true);
  };

  const openAddService = () => {
    if (categories.length === 0) {
      Alert.alert('No Categories', 'Please add a category first.');
      return;
    }
    setEditingType('service');
    setEditingId(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setStartingPrice('');
    setSelectedCategory(categories[0].id);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!addOpened.current && params.add === '1' && role === 'super' && categories.length > 0) {
      addOpened.current = true;
      openAddService();
    }
  }, [params.add, role, categories.length]);

  const openEditService = (svc: Service) => {
    setEditingType('service');
    setEditingId(svc.id);
    setName(svc.name);
    setDescription(svc.description || '');
    setImageUrl(svc.image_url || '');
    setStartingPrice(String(svc.starting_price));
    setSelectedCategory(svc.category_id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    setSaving(true);

    if (editingType === 'category') {
      const payload = {
        name: name.trim(),
        icon_name: iconName.trim() || 'wrench',
        image_url: imageUrl.trim() || null,
      };

      if (editingId) {
        await supabase.from('service_categories').update(payload).eq('id', editingId);
      } else {
        await supabase.from('service_categories').insert(payload);
      }
    } else if (editingType === 'service') {
      if (!selectedCategory) {
        Alert.alert('Required', 'Please select a category.');
        setSaving(false);
        return;
      }

      const payload = {
        category_id: selectedCategory,
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        starting_price: Number(startingPrice) || 0,
      };

      if (editingId) {
        await supabase.from('services').update(payload).eq('id', editingId);
      } else {
        await supabase.from('services').insert(payload);
      }
    }

    setSaving(false);
    setModalVisible(false);
    loadData();
  };

  const handleDelete = (type: 'category' | 'service', id: string, itemName: string) => {
    Alert.alert(
      'Delete',
      `Are you sure you want to delete "${itemName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const table = type === 'category' ? 'service_categories' : 'services';
            await supabase.from(table).delete().eq('id', id);
            loadData();
          },
        },
      ]
    );
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
            <Text style={styles.headerTitle}>Services</Text>
            <Text style={styles.headerSubtitle}>Manage categories & services</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {role === 'super' && (
            <TouchableOpacity style={styles.addBtn} onPress={openAddCategory}>
              <Plus size={16} color={Colors.primary[700]} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {categories.length === 0 ? (
          <Text style={styles.emptyText}>No categories yet. {role === 'viewer' ? '' : 'Add one to get started.'}</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{cat.name}</Text>
                <Text style={styles.itemMeta}>{cat.icon_name}</Text>
              </View>
              {role === 'super' ? (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditCategory(cat)}
                  >
                    <Pencil size={16} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete('category', cat.id, cat.name)}
                  >
                    <Trash2 size={16} color={Colors.error[500]} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemActions}>
                  <Eye size={16} color={Colors.neutral[300]} />
                </View>
              )}
            </View>
          ))
        )}

        {/* Services Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={styles.sectionTitle}>Services</Text>
          {role === 'super' && (
            <TouchableOpacity style={styles.addBtn} onPress={openAddService}>
              <Plus size={16} color={Colors.primary[700]} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {services.length === 0 ? (
          <Text style={styles.emptyText}>No services yet. {role === 'viewer' ? '' : 'Add one to get started.'}</Text>
        ) : (
          services.map((svc) => {
            const cat = categories.find((c) => c.id === svc.category_id);
            return (
              <View key={svc.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{svc.name}</Text>
                  <View style={styles.itemMetaRow}>
                    <Tag size={12} color={Colors.neutral[400]} />
                    <Text style={styles.itemMeta}>{cat?.name || 'Uncategorized'}</Text>
                    <IndianRupee size={12} color={Colors.neutral[400]} />
                    <Text style={styles.itemMeta}>{svc.starting_price}</Text>
                    <Star size={12} color={Colors.accent[500]} fill={Colors.accent[500]} />
                    <Text style={styles.itemMeta}>{svc.rating}</Text>
                  </View>
                </View>
                {role === 'super' ? (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEditService(svc)}
                    >
                      <Pencil size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDelete('service', svc.id, svc.name)}
                    >
                      <Trash2 size={16} color={Colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.itemActions}>
                    <Eye size={16} color={Colors.neutral[300]} />
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={role === 'super' && modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit' : 'Add'} {editingType === 'category' ? 'Category' : 'Service'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={Colors.neutral[400]}
            />

            {editingType === 'category' && (
              <>
                <Text style={styles.inputLabel}>Icon Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={iconName}
                  onChangeText={setIconName}
                  placeholder="e.g. wrench, fan, droplet"
                  placeholderTextColor={Colors.neutral[400]}
                />
                <Text style={styles.inputHint}>Use lucide icon names</Text>
              </>
            )}

            {editingType === 'service' && (
              <>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryPicker}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        selectedCategory === cat.id && styles.categoryPillActive,
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          selectedCategory === cat.id && styles.categoryPillTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description"
                  placeholderTextColor={Colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>Starting Price</Text>
                <TextInput
                  style={styles.textInput}
                  value={startingPrice}
                  onChangeText={setStartingPrice}
                  placeholder="e.g. 299"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={styles.inputLabel}>Image URL (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[700],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[700],
  },
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
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
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
  inputHint: {
    fontSize: 11,
    color: Colors.neutral[400],
    marginTop: 2,
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
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryPill: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary[600],
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  categoryPillTextActive: {
    color: Colors.neutral[0],
  },
  saveButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
});
