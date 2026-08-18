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
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Check, Clock, ChevronRight, Calendar } from 'lucide-react-native';
import { supabase, Service, ServicePackage } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { addonSum, isServiceEnabled, parseService, pricingLabel, serviceBanners } from '@/lib/catalogMeta';

export default function ServiceDetailScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      if (category) {
        const svcRes = await supabase.from('services').select('*').eq('category_id', category);
        const svcIds = (svcRes.data || []).map((s) => s.id);
        const pkgRes = svcIds.length > 0
          ? await supabase.from('service_packages').select('*').in('service_id', svcIds)
          : { data: [], error: null };
        if (svcRes.data && svcRes.data.length > 0) {
          const visible = svcRes.data.filter(isServiceEnabled);
          setServices(visible);
          if (visible[0]) {
            setSelectedService(visible[0]);
            if (pkgRes.data) setPackages(pkgRes.data.filter((p) => p.service_id === visible[0].id));
          }
        }
      } else if (id) {
        const [svcRes, pkgRes] = await Promise.all([
          supabase.from('services').select('*').eq('id', id).maybeSingle(),
          supabase.from('service_packages').select('*').eq('service_id', id),
        ]);
        if (svcRes.data && isServiceEnabled(svcRes.data)) setSelectedService(svcRes.data);
        if (pkgRes.data) setPackages(pkgRes.data);
      }
    } catch {
      // network error
    }
    setLoading(false);
  }, [id, category]);

  useEffect(() => {
    loadData();
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, [loadData]);

  const switchService = (svc: Service) => {
    setSelectedService(svc);
    setSelectedPackage(null);
    setSelectedAddonIds([]);
    supabase
      .from('service_packages')
      .select('*')
      .eq('service_id', svc.id)
      .then(({ data }) => setPackages(data || []));
  };

  const handleBook = () => {
    if (!selectedService) return;
    if (!selectedPackage) {
      Alert.alert('Select a Package', 'Please select a package to continue.');
      return;
    }
    const pkg = packages.find((p) => p.id === selectedPackage);
    if (!pkg) return;
    const addonQ = selectedAddonIds.length ? `&addons=${selectedAddonIds.join(',')}` : '';
    router.push(`/booking/new?service=${selectedService.id}&package=${pkg.id}${addonQ}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (!selectedService) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Service not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: selectedService.image_url || '' }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={Colors.neutral[0]} />
          </TouchableOpacity>
        </View>

        {serviceBanners(selectedService).length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRow}>
            {serviceBanners(selectedService).slice(1).map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.extraBanner} />
            ))}
          </ScrollView>
        )}

        {/* Service info */}
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{selectedService.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingPill}>
              <Star size={12} color={Colors.neutral[0]} fill={Colors.neutral[0]} />
              <Text style={styles.ratingText}>{selectedService.rating}</Text>
            </View>
            <Text style={styles.reviewsText}>{selectedService.reviews_count} reviews</Text>
          </View>
          <Text style={styles.serviceDesc}>{parseService(selectedService).description}</Text>
          {!!parseService(selectedService).meta.estimated_time && (
            <View style={styles.ratingRow}>
              <Clock size={14} color={Colors.neutral[500]} />
              <Text style={styles.reviewsText}>Est. {parseService(selectedService).meta.estimated_time}</Text>
            </View>
          )}
          <Text style={[styles.reviewsText, { marginTop: 8 }]}>{pricingLabel(selectedService)}</Text>
        </View>

        {/* Multiple services in same category */}
        {services.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services in this category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceTabs}>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[
                    styles.serviceTab,
                    selectedService.id === svc.id && styles.serviceTabActive,
                  ]}
                  onPress={() => switchService(svc)}
                >
                  <Text
                    style={[
                      styles.serviceTabText,
                      selectedService.id === svc.id && styles.serviceTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {svc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Package</Text>
          {packages.length === 0 ? (
            <Text style={styles.noPackages}>No packages available</Text>
          ) : (
            packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage === pkg.id && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPackage(pkg.id)}
                activeOpacity={0.7}
              >
                {pkg.is_recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <View style={styles.packageRadio}>
                    {selectedPackage === pkg.id && <Check size={14} color={Colors.neutral[0]} />}
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <View style={styles.packageMeta}>
                      <Clock size={12} color={Colors.neutral[400]} />
                      <Text style={styles.packageDuration}>{pkg.duration}</Text>
                    </View>
                  </View>
                  <Text style={styles.packagePrice}>₹{pkg.price}</Text>
                </View>
                <Text style={styles.packageDesc}>{pkg.description}</Text>
                <View style={styles.includesList}>
                  {pkg.includes.map((inc, i) => (
                    <View key={i} style={styles.includeItem}>
                      <Check size={14} color={Colors.success[600]} />
                      <Text style={styles.includeText}>{inc}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {(parseService(selectedService).meta.addons || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add-ons / extras</Text>
            {(parseService(selectedService).meta.addons || []).map((a) => {
              const on = selectedAddonIds.includes(a.id);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.packageCard, on && styles.packageCardSelected]}
                  onPress={() =>
                    setSelectedAddonIds((ids) => (ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id]))
                  }
                >
                  <View style={styles.packageHeader}>
                    <View style={styles.packageRadio}>{on && <Check size={14} color={Colors.neutral[0]} />}</View>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{a.name}</Text>
                    </View>
                    <Text style={styles.packagePrice}>+₹{a.price}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {!!parseService(selectedService).meta.visiting_fee && (
          <View style={styles.section}>
            <Text style={styles.visitNote}>
              Inspection only: agar repair nahi karaya to visiting fee ₹{parseService(selectedService).meta.visiting_fee} lagegi.
            </Text>
          </View>
        )}

        {/* Trust badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Check size={16} color={Colors.success[600]} />
            <Text style={styles.trustText}>Verified Professionals</Text>
          </View>
          <View style={styles.trustItem}>
            <Check size={16} color={Colors.success[600]} />
            <Text style={styles.trustText}>Quality Assured</Text>
          </View>
          <View style={styles.trustItem}>
            <Check size={16} color={Colors.success[600]} />
            <Text style={styles.trustText}>Service Warranty</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          {selectedPackage ? (
            <>
              <Text style={styles.bottomLabel}>Total Price</Text>
              <Text style={styles.bottomPrice}>
                ₹
                {(packages.find((p) => p.id === selectedPackage)?.price || selectedService.starting_price) +
                  addonSum((parseService(selectedService).meta.addons || []).filter((a) => selectedAddonIds.includes(a.id)))}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.bottomLabel}>
                {parseService(selectedService).meta.pricing_type === 'quote' ? 'Quote' : 'Starting from'}
              </Text>
              <Text style={styles.bottomPrice}>{pricingLabel(selectedService)}</Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookButtonText}>Book Now</Text>
          <ChevronRight size={18} color={Colors.neutral[0]} />
        </TouchableOpacity>
      </View>
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
  heroWrap: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  extraBanner: { width: 140, height: 80, borderRadius: Radius.md, backgroundColor: Colors.neutral[200] },
  visitNote: {
    fontSize: 13,
    color: Colors.neutral[600],
    backgroundColor: Colors.primary[50],
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  serviceInfo: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  ratingRow: {
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
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  reviewsText: {
    fontSize: 13,
    color: Colors.neutral[400],
  },
  serviceDesc: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  section: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  serviceTabs: {
    gap: Spacing.sm,
  },
  serviceTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
  },
  serviceTabActive: {
    backgroundColor: Colors.primary[600],
  },
  serviceTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  serviceTabTextActive: {
    color: Colors.neutral[0],
  },
  noPackages: {
    fontSize: 14,
    color: Colors.neutral[400],
    paddingVertical: Spacing.md,
  },
  packageCard: {
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.md,
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  packageRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  packageDuration: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  packageDesc: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  includesList: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  includeText: {
    fontSize: 13,
    color: Colors.neutral[700],
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[0],
    marginBottom: Spacing.sm,
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
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    gap: 4,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
});
