import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, Star } from 'lucide-react-native';
import { supabase, ServiceCategory, Service } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { enabledServices, isCategoryEnabled, parseService, pricingLabel, categoryParentId } from '@/lib/catalogMeta';
import { CatalogImage } from '@/components/CatalogImage';

export default function ServicesScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(q ? String(q) : '');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (q) setSearch(String(q));
  }, [q]);

  const loadData = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('services').select('*').order('is_popular', { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data.filter(isCategoryEnabled));
      if (svcRes.data) setServices(enabledServices(svcRes.data));
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filtered = services.filter((s) => {
    const matchSearch = search.trim() === '' || s.name.toLowerCase().includes(search.toLowerCase());
    const childIds = categories.filter((c) => categoryParentId(c) === activeCategory).map((c) => c.id);
    const matchCat =
      !activeCategory || s.category_id === activeCategory || childIds.includes(s.category_id);
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Services</Text>
        <Text style={styles.headerSubtitle}>Book trusted professionals</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={20} color={Colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor={Colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        <TouchableOpacity
          style={[styles.chip, !activeCategory && styles.chipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, activeCategory === cat.id && styles.chipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.chipText, activeCategory === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service list */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        ) : (
          filtered.map((svc) => {
            const cat = categories.find((c) => c.id === svc.category_id);
            return (
              <TouchableOpacity
                key={svc.id}
                style={styles.serviceCard}
                onPress={() => router.push(`/service/${svc.id}`)}
                activeOpacity={0.8}
              >
                <CatalogImage name={svc.name} imageUrl={svc.image_url} style={styles.serviceImage} />
                <View style={styles.serviceInfo}>
                  {cat && <Text style={styles.serviceCategory}>{cat.name}</Text>}
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>{parseService(svc).description}</Text>
                  <View style={styles.serviceMeta}>
                    <View style={styles.ratingPill}>
                      <Star size={11} color={Colors.neutral[0]} fill={Colors.neutral[0]} />
                      <Text style={styles.ratingPillText}>{svc.rating}</Text>
                    </View>
                    <Text style={styles.reviewsText}>{svc.reviews_count} reviews</Text>
                  </View>
                  <Text style={styles.servicePrice}>{pricingLabel(svc)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
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
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.neutral[900],
  },
  chipScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  chipActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  chipTextActive: {
    color: Colors.neutral[0],
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[400],
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  serviceImage: {
    width: 110,
    height: '100%',
    resizeMode: 'cover',
    minHeight: 130,
  },
  serviceInfo: {
    flex: 1,
    padding: Spacing.md,
  },
  serviceCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary[600],
    textTransform: 'uppercase',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginTop: 2,
  },
  serviceDesc: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
    lineHeight: 18,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success[600],
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  reviewsText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary[700],
    marginTop: 6,
  },
});
