import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Star, ChevronRight, Search, ShieldCheck, Clock, BadgePercent } from 'lucide-react-native';
import { supabase, ServiceCategory, Service } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { topLevelCategories, enabledServices, pricingLabel } from '@/lib/catalogMeta';
import { CatalogImage } from '@/components/CatalogImage';

const { width } = Dimensions.get('window');

const DEFAULT_BANNERS = [
  { title: 'AC Servicing', subtitle: 'Cooling theek, ghar aaram', color: '#1189f5', name: 'AC Repair' },
  { title: 'Air Cooler', subtitle: 'Cooler service & repair', color: '#0ea5e9', name: 'Cooler Repair' },
  { title: 'Fridge & Washing', subtitle: 'Ghar ke appliances', color: '#10b981', name: 'Fridge Repair' },
];

export default function HomeScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const banners = useMemo(() => {
    if (categories.length > 0) {
      return categories.slice(0, 4).map((cat, i) => ({
        title: cat.name,
        subtitle: 'Book verified professionals',
        color: ['#1189f5', '#0ea5e9', '#10b981', '#f59e0b'][i % 4],
        name: cat.name,
      }));
    }
    return DEFAULT_BANNERS;
  }, [categories]);

  const loadData = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('services').select('*').eq('is_popular', true).order('rating', { ascending: false }),
      ]);
      if (catRes.data) setCategories(topLevelCategories(catRes.data));
      if (svcRes.data) setPopularServices(enabledServices(svcRes.data));
    } catch {
      // network error — show empty state
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/icon.png')} style={styles.headerLogo} />
            <View>
              <Text style={styles.headerGreeting}>Gharmitra</Text>
              <Text style={styles.headerLocation}>Har Ghar Ki Har Service</Text>
            </View>
          </View>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>Home</Text>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/services')}
          activeOpacity={0.8}
        >
          <Search size={20} color={Colors.neutral[400]} />
          <Text style={styles.searchPlaceholder}>AC, plumber, safai... dhundhe</Text>
        </TouchableOpacity>

        {/* Banner carousel */}
        <View style={styles.bannerContainer}>
          {banners.map((banner, i) => (
            <View
              key={i}
              style={[
                styles.banner,
                { opacity: i === bannerIndex ? 1 : 0, zIndex: i === bannerIndex ? 1 : 0 },
              ]}
            >
              <CatalogImage name={banner.name} style={styles.bannerImage} />
              <View style={[styles.bannerOverlay, { backgroundColor: `${banner.color}cc` }]}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              </View>
            </View>
          ))}
          <View style={styles.bannerDots}>
            {banners.map((_, i) => (
              <View
                key={i}
                style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <ShieldCheck size={20} color={Colors.primary[600]} />
            <Text style={styles.trustText}>Verified Pros</Text>
          </View>
          <View style={styles.trustItem}>
            <Clock size={20} color={Colors.primary[600]} />
            <Text style={styles.trustText}>On-Time</Text>
          </View>
          <View style={styles.trustItem}>
            <BadgePercent size={20} color={Colors.primary[600]} />
            <Text style={styles.trustText}>Best Prices</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Services</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/service?category=${cat.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryImageWrap}>
                  <CatalogImage name={cat.name} imageUrl={cat.image_url} style={styles.categoryImage} />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Booked Services</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularScroll}
          >
            {popularServices.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.popularCard}
                onPress={() => router.push(`/service/${svc.id}`)}
                activeOpacity={0.8}
              >
                <CatalogImage name={svc.name} imageUrl={svc.image_url} style={styles.popularImage} />
                <View style={styles.popularInfo}>
                  <Text style={styles.popularName} numberOfLines={1}>{svc.name}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={12} color={Colors.accent[500]} fill={Colors.accent[500]} />
                    <Text style={styles.ratingText}>{svc.rating}</Text>
                    <Text style={styles.reviewsText}> ({svc.reviews_count})</Text>
                  </View>
                  <Text style={styles.popularPrice}>{pricingLabel(svc)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Offer banner */}
        <TouchableOpacity style={styles.offerBanner} onPress={() => router.push('/(tabs)/services')} activeOpacity={0.85}>
          <View>
            <Text style={styles.offerTitle}>Promo code booking pe lagao</Text>
            <Text style={styles.offerSubtitle}>Admin wale coupon (jaise SAVE50) checkout pe apply honge</Text>
          </View>
        </TouchableOpacity>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  headerLocation: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  locationBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[700],
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
  searchPlaceholder: {
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.neutral[400],
  },
  bannerContainer: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.neutral[0],
    marginTop: 4,
    opacity: 0.9,
  },
  bannerDots: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 6,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  bannerDotActive: {
    backgroundColor: Colors.neutral[0],
    width: 18,
  borderRadius: 3,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  trustItem: {
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  section: {
    marginTop: Spacing.sm,
  paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3,
    alignItems: 'center',
  },
  categoryImageWrap: {
    width: 70,
    height: 70,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
    marginBottom: Spacing.xs + 2,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  popularScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  popularCard: {
    width: 200,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  popularImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  popularInfo: {
    padding: Spacing.sm + 2,
  },
  popularName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  reviewsText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  popularPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[700],
    marginTop: 4,
  },
  offerBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  offerSubtitle: {
    fontSize: 13,
    color: Colors.neutral[0],
    opacity: 0.9,
    marginTop: 2,
  },
  offerBadge: {
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  offerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  adminLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[400],
  },
});
