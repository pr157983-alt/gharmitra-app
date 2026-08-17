import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, ChevronRight } from 'lucide-react-native';
import { supabase, ServiceCategory, Service } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function CategoryServicesScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const [cat, setCat] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!category) {
      setLoading(false);
      return;
    }
    try {
      const [catRes, svcRes] = await Promise.all([
        supabase.from('service_categories').select('*').eq('id', category).maybeSingle(),
        supabase.from('services').select('*').eq('category_id', category).order('is_popular', { ascending: false }),
      ]);
      if (catRes.data) setCat(catRes.data);
      if (svcRes.data) setServices(svcRes.data);
    } catch {
      // network error
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    loadData();
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, [loadData]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{cat?.name || 'Services'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No services in this category</Text>
          </View>
        ) : (
          services.map((svc) => (
            <TouchableOpacity
              key={svc.id}
              style={styles.serviceCard}
              onPress={() => router.push(`/service/${svc.id}`)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: svc.image_url || '' }} style={styles.serviceImage} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{svc.name}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>{svc.description}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.ratingPill}>
                    <Star size={11} color={Colors.neutral[0]} fill={Colors.neutral[0]} />
                    <Text style={styles.ratingText}>{svc.rating}</Text>
                  </View>
                  <Text style={styles.reviewsText}>{svc.reviews_count} reviews</Text>
                </View>
                <Text style={styles.servicePrice}>₹{svc.starting_price} onwards</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[300]} style={styles.chevron} />
            </TouchableOpacity>
          ))
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
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
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
    alignItems: 'center',
  },
  serviceImage: {
    width: 90,
    height: 90,
    resizeMode: 'cover',
  },
  serviceInfo: {
    flex: 1,
    padding: Spacing.md,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  serviceDesc: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
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
  ratingText: {
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
    marginTop: 4,
  },
  chevron: {
    marginRight: Spacing.md,
  },
});
