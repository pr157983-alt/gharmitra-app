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
  Switch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, Pencil, Tag, IndianRupee, Star, X, Eye } from 'lucide-react-native';
import { supabase, ServiceCategory, Service } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import {
  parseCategory,
  parseService,
  writeCategoryIcon,
  writeServiceDescription,
  categoryParentId,
  pricingTypeLabel,
  newAddonId,
  type PricingType,
  type ServiceAddon,
} from '@/lib/catalogMeta';

export default function AdminServicesScreen() {
  const params = useLocalSearchParams<{ add?: string }>();
  const addOpened = useRef(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<'category' | 'service' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const [catEnabled, setCatEnabled] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [banners, setBanners] = useState('');
  const [svcEnabled, setSvcEnabled] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [visitingFee, setVisitingFee] = useState('');
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');
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
      setRole((sessionStorage.getItem('admin_role') as 'super' | 'viewer') || 'super');
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const parents = categories.filter((c) => !categoryParentId(c));
  const childrenOf = (id: string) => categories.filter((c) => categoryParentId(c) === id);

  const openAddCategory = () => {
    setEditingType('category');
    setEditingId(null);
    setName('');
    setIconName('');
    setImageUrl('');
    setParentId('');
    setCatEnabled(true);
    setModalVisible(true);
  };

  const openEditCategory = (cat: ServiceCategory) => {
    const { meta, icon } = parseCategory(cat);
    setEditingType('category');
    setEditingId(cat.id);
    setName(cat.name);
    setIconName(icon);
    setImageUrl(cat.image_url || '');
    setParentId(meta.parent_id || '');
    setCatEnabled(meta.enabled !== false);
    setModalVisible(true);
  };

  const resetServiceForm = (categoryId?: string) => {
    setName('');
    setDescription('');
    setImageUrl('');
    setStartingPrice('');
    setPricingType('fixed');
    setEstimatedTime('');
    setBanners('');
    setSvcEnabled(true);
    setIsPopular(false);
    setVisitingFee('');
    setAddons([]);
    setAddonName('');
    setAddonPrice('');
    setSelectedCategory(categoryId || categories[0]?.id || '');
  };

  const openAddService = () => {
    if (categories.length === 0) {
      Alert.alert('No Categories', 'Pehle category add karo.');
      return;
    }
    setEditingType('service');
    setEditingId(null);
    resetServiceForm();
    setModalVisible(true);
  };

  useEffect(() => {
    if (!addOpened.current && params.add === '1' && role === 'super' && categories.length > 0) {
      addOpened.current = true;
      openAddService();
    }
  }, [params.add, role, categories.length]);

  const openEditService = (svc: Service) => {
    const { meta, description: desc } = parseService(svc);
    setEditingType('service');
    setEditingId(svc.id);
    setName(svc.name);
    setDescription(desc);
    setImageUrl(svc.image_url || '');
    setStartingPrice(String(svc.starting_price));
    setSelectedCategory(svc.category_id);
    setPricingType(meta.pricing_type || 'fixed');
    setEstimatedTime(meta.estimated_time || '');
    setBanners((meta.banners || []).join('\n'));
    setSvcEnabled(meta.enabled !== false);
    setIsPopular(Boolean(svc.is_popular));
    setVisitingFee(meta.visiting_fee ? String(meta.visiting_fee) : '');
    setAddons(meta.addons || []);
    setAddonName('');
    setAddonPrice('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    setSaving(true);

    if (editingType === 'category') {
      if (parentId && parentId === editingId) {
        Alert.alert('Invalid', 'Category apni parent nahi ho sakti.');
        setSaving(false);
        return;
      }
      const payload = {
        name: name.trim(),
        icon_name: writeCategoryIcon({ parent_id: parentId || null, enabled: catEnabled }, iconName),
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

      const extraBanners = banners
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        category_id: selectedCategory,
        name: name.trim(),
        description: writeServiceDescription(
          {
            pricing_type: pricingType,
            estimated_time: estimatedTime.trim(),
            enabled: svcEnabled,
            banners: extraBanners,
            visiting_fee: Number(visitingFee) || 0,
            addons,
          },
          description
        ),
        image_url: imageUrl.trim() || null,
        starting_price: Number(startingPrice) || 0,
        is_popular: isPopular,
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
    Alert.alert('Delete', `"${itemName}" delete karein?`, [
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
    ]);
  };

  const renderCatRow = (cat: ServiceCategory, indent: boolean) => {
    const { meta, icon } = parseCategory(cat);
    const on = meta.enabled !== false;
    return (
      <View key={cat.id} style={[styles.itemCard, indent && styles.indentCard]}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {indent ? '↳ ' : ''}
            {cat.name}
            {!on ? '  · OFF' : ''}
          </Text>
          <Text style={styles.itemMeta}>
            {indent ? 'Sub-category' : 'Category'} · {icon}
            {indent ? '' : ` · ${childrenOf(cat.id).length} sub`}
          </Text>
        </View>
        {role === 'super' ? (
          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEditCategory(cat)}>
              <Pencil size={16} color={Colors.neutral[500]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete('category', cat.id, cat.name)}>
              <Trash2 size={16} color={Colors.error[500]} />
            </TouchableOpacity>
          </View>
        ) : (
          <Eye size={16} color={Colors.neutral[300]} />
        )}
      </View>
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
        <Text style={styles.headerTitle}>Services</Text>
        <Text style={styles.headerSubtitle}>Category, sub-category, service details, enable/disable</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories / Sub-categories</Text>
          {role === 'super' && (
            <TouchableOpacity style={styles.addBtn} onPress={openAddCategory}>
              <Plus size={16} color={Colors.primary[700]} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {categories.length === 0 ? (
          <Text style={styles.emptyText}>No categories yet.</Text>
        ) : (
          parents.map((cat) => (
            <View key={cat.id}>
              {renderCatRow(cat, false)}
              {childrenOf(cat.id).map((sub) => renderCatRow(sub, true))}
            </View>
          ))
        )}
        {categories.filter((c) => {
          const pid = categoryParentId(c);
          return pid && !categories.some((p) => p.id === pid);
        }).map((orphan) => renderCatRow(orphan, true))}

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
          <Text style={styles.emptyText}>No services yet.</Text>
        ) : (
          services.map((svc) => {
            const cat = categories.find((c) => c.id === svc.category_id);
            const { meta } = parseService(svc);
            const on = meta.enabled !== false;
            return (
              <View key={svc.id} style={[styles.itemCard, !on && styles.offCard]}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {svc.name}
                    {!on ? '  · OFF' : ''}
                    {svc.is_popular ? '  · Popular' : ''}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Tag size={12} color={Colors.neutral[400]} />
                    <Text style={styles.itemMeta}>{cat?.name || 'Uncategorized'}</Text>
                    <IndianRupee size={12} color={Colors.neutral[400]} />
                    <Text style={styles.itemMeta}>{pricingTypeLabel(meta.pricing_type)}</Text>
                    <Star size={12} color={Colors.accent[500]} fill={Colors.accent[500]} />
                    <Text style={styles.itemMeta}>{svc.rating}</Text>
                  </View>
                  {!!meta.estimated_time && <Text style={styles.itemMeta}>Time: {meta.estimated_time}</Text>}
                  {!!meta.visiting_fee && <Text style={styles.itemMeta}>Visit fee: ₹{meta.visiting_fee}</Text>}
                  {!!meta.addons?.length && <Text style={styles.itemMeta}>{meta.addons.length} add-ons</Text>}
                </View>
                {role === 'super' ? (
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditService(svc)}>
                      <Pencil size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete('service', svc.id, svc.name)}>
                      <Trash2 size={16} color={Colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Eye size={16} color={Colors.neutral[300]} />
                )}
              </View>
            );
          })
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Modal visible={role === 'super' && modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit' : 'Add'} {editingType === 'category' ? 'Category' : 'Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={editingType === 'category' ? 'e.g. Home Appliances' : 'e.g. AC Repair'}
                placeholderTextColor={Colors.neutral[400]}
              />

              {editingType === 'category' && (
                <>
                  <Text style={styles.inputLabel}>Parent category (sub-category ke liye)</Text>
                  <View style={styles.categoryPicker}>
                    <TouchableOpacity
                      style={[styles.categoryPill, !parentId && styles.categoryPillActive]}
                      onPress={() => setParentId('')}
                    >
                      <Text style={[styles.categoryPillText, !parentId && styles.categoryPillTextActive]}>None (top)</Text>
                    </TouchableOpacity>
                    {parents
                      .filter((c) => c.id !== editingId)
                      .map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryPill, parentId === cat.id && styles.categoryPillActive]}
                          onPress={() => setParentId(cat.id)}
                        >
                          <Text style={[styles.categoryPillText, parentId === cat.id && styles.categoryPillTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                  <Text style={styles.inputHint}>Example: parent Home Appliances, name AC Repair</Text>

                  <Text style={styles.inputLabel}>Icon Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={iconName}
                    onChangeText={setIconName}
                    placeholder="e.g. wrench, fan, droplet"
                    placeholderTextColor={Colors.neutral[400]}
                  />

                  <View style={styles.toggleRow}>
                    <Text style={styles.inputLabel}>Enable category</Text>
                    <Switch value={catEnabled} onValueChange={setCatEnabled} />
                  </View>
                </>
              )}

              {editingType === 'service' && (
                <>
                  <Text style={styles.inputLabel}>Category / Sub-category</Text>
                  <View style={styles.categoryPicker}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            selectedCategory === cat.id && styles.categoryPillTextActive,
                          ]}
                        >
                          {categoryParentId(cat) ? `↳ ${cat.name}` : cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Customer ko dikhega"
                    placeholderTextColor={Colors.neutral[400]}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.inputLabel}>Pricing type</Text>
                  <View style={styles.categoryPicker}>
                    {(['fixed', 'hourly', 'quote'] as PricingType[]).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.categoryPill, pricingType === p && styles.categoryPillActive]}
                        onPress={() => setPricingType(p)}
                      >
                        <Text style={[styles.categoryPillText, pricingType === p && styles.categoryPillTextActive]}>
                          {pricingTypeLabel(p)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>
                    {pricingType === 'hourly' ? 'Rate per hour' : pricingType === 'quote' ? 'Starting / estimate (optional)' : 'Fixed / starting price'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={startingPrice}
                    onChangeText={setStartingPrice}
                    placeholder="e.g. 299"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Estimated time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={estimatedTime}
                    onChangeText={setEstimatedTime}
                    placeholder="e.g. 45 mins, 2 hours"
                    placeholderTextColor={Colors.neutral[400]}
                  />

                  <Text style={styles.inputLabel}>Inspection / visiting fee</Text>
                  <TextInput
                    style={styles.textInput}
                    value={visitingFee}
                    onChangeText={setVisitingFee}
                    placeholder="Repair mana kare to minimum fee, e.g. 199"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputHint}>Check-up ke baad repair nahi hua to ye amount auto bill pe lagti hai.</Text>

                  <Text style={styles.inputLabel}>Add-ons / extras</Text>
                  {addons.map((a) => (
                    <View key={a.id} style={styles.addonRow}>
                      <Text style={styles.addonText}>
                        {a.name} · ₹{a.price}
                      </Text>
                      <TouchableOpacity onPress={() => setAddons((list) => list.filter((x) => x.id !== a.id))}>
                        <Text style={styles.removeAddon}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.addonForm}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={addonName}
                      onChangeText={setAddonName}
                      placeholder="Foam jet wash"
                      placeholderTextColor={Colors.neutral[400]}
                    />
                    <TextInput
                      style={[styles.textInput, { width: 90 }]}
                      value={addonPrice}
                      onChangeText={setAddonPrice}
                      placeholder="200"
                      placeholderTextColor={Colors.neutral[400]}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.addAddonBtn}
                      onPress={() => {
                        if (!addonName.trim()) return;
                        setAddons((list) => [
                          ...list,
                          { id: newAddonId(), name: addonName.trim(), price: Number(addonPrice) || 0 },
                        ]);
                        setAddonName('');
                        setAddonPrice('');
                      }}
                    >
                      <Text style={styles.addAddonText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toggleRow}>
                    <Text style={styles.inputLabel}>Enable service (customer app)</Text>
                    <Switch value={svcEnabled} onValueChange={setSvcEnabled} />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={styles.inputLabel}>Popular (home pe dikhe)</Text>
                    <Switch value={isPopular} onValueChange={setIsPopular} />
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>{editingType === 'service' ? 'Main image URL' : 'Image / banner URL'}</Text>
              <TextInput
                style={styles.textInput}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="none"
              />

              {editingType === 'service' && (
                <>
                  <Text style={styles.inputLabel}>Extra images / banners</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={banners}
                    onChangeText={setBanners}
                    placeholder="Ek line pe ek URL"
                    placeholderTextColor={Colors.neutral[400]}
                    multiline
                    autoCapitalize="none"
                  />
                </>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[700] },
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
  emptyText: { fontSize: 14, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
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
  indentCard: { marginLeft: 18, borderColor: Colors.primary[200] },
  offCard: { opacity: 0.55 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.neutral[900] },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  itemMeta: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '92%',
    maxWidth: 480,
    maxHeight: '88%',
  },
  modalScroll: { maxHeight: 520 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700], marginTop: Spacing.sm, marginBottom: 4 },
  inputHint: { fontSize: 11, color: Colors.neutral[400], marginTop: 2 },
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
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  addonText: { fontSize: 13, color: Colors.neutral[800], fontWeight: '600' },
  removeAddon: { fontSize: 12, fontWeight: '700', color: Colors.error[500] },
  addonForm: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  addAddonBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addAddonText: { color: Colors.neutral[0], fontWeight: '700', fontSize: 13 },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  categoryPill: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  categoryPillActive: { backgroundColor: Colors.primary[600] },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  categoryPillTextActive: { color: Colors.neutral[0] },
  saveButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
});
