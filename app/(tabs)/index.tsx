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
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Star, Search, ShieldCheck, Clock, BadgePercent, MapPin, Bell, ChevronRight } from 'lucide-react-native';
import { supabase, ServiceCategory, Service, Booking, ServicePackage } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { topLevelCategories, enabledServices, parseService } from '@/lib/catalogMeta';
import { CatalogImage } from '@/components/CatalogImage';
import { DealCountdown } from '@/components/DealCountdown';
import { PriceTag } from '@/components/PriceTag';
import { loadCoupons, loadPromoOffers, livePromoOffers, offerDiscountLabel, promoToCoupon } from '@/lib/offers';
import type { Coupon, PromoOffer } from '@/lib/catalogMeta';
import { readCustomerSession, setCustomerCity } from '@/lib/customerSession';
import { comboPricing, couponOnPrice, isCombo } from '@/lib/deals';

const { width } = Dimensions.get('window');

const DEFAULT_BANNERS = [
  { title: 'AC Servicing', subtitle: 'Cooling theek, ghar aaram', color: '#1189f5', name: 'AC Repair' },
  { title: 'Air Cooler', subtitle: 'Cooler service & repair', color: '#0ea5e9', name: 'Cooler Repair' },
  { title: 'Fridge & Washing', subtitle: 'Ghar ke appliances', color: '#10b981', name: 'Fridge Repair' },
];

function couponLabel(c: Coupon) {
  if (c.percent > 0) return `${c.percent}% OFF`;
  if (c.flat > 0) return `₹${c.flat} OFF`;
  return c.code;
}

export default function HomeScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promoOffers, setPromoOffers] = useState<PromoOffer[]>([]);
  const [recentBooking, setRecentBooking] = useState<Booking | null>(null);
  const [city, setCity] = useState('');
  const [editingCity, setEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState('');
  const [search, setSearch] = useState('');
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
    const session = readCustomerSession();
    if (session.city) setCity(session.city);
    try {
      const [catRes, svcRes, popRes, pkgRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order'),
        supabase.from('services').select('*').order('is_popular', { ascending: false }),
        supabase.from('services').select('*').eq('is_popular', true).order('rating', { ascending: false }),
        supabase.from('service_packages').select('*').order('price'),
      ]);
      if (catRes.data) setCategories(topLevelCategories(catRes.data));
      if (svcRes.data) setAllServices(enabledServices(svcRes.data));
      if (popRes.data) setPopularServices(enabledServices(popRes.data));
      if (pkgRes.data) setPackages(pkgRes.data);
      setCoupons((await loadCoupons()).filter((c) => c.enabled !== false));
      setPromoOffers(await loadPromoOffers());
      if (session.id || session.phone) {
        let q = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(1);
        if (session.id && session.phone) q = q.or(`customer_id.eq.${session.id},phone.eq.${session.phone}`);
        else if (session.id) q = q.eq('customer_id', session.id);
        else q = q.eq('phone', session.phone);
        const { data } = await q;
        const row = (Array.isArray(data) ? data[0] : data) as Booking | undefined;
        setRecentBooking(row || null);
        if (!session.city && row?.address) {
          const parts = String(row.address).split(',').map((p) => p.trim()).filter(Boolean);
          const guessed = parts.length >= 2 ? parts[parts.length - 2] : '';
          if (guessed) {
            setCity(guessed);
            setCustomerCity(guessed);
          }
        }
      } else {
        setRecentBooking(null);
      }
    } catch {
      // network error — show empty state
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return allServices.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [search, allServices]);

  const liveOffers = useMemo(() => livePromoOffers(promoOffers), [promoOffers]);
  const featuredCoupon = liveOffers[0] ? promoToCoupon(liveOffers[0]) : coupons[0] || null;
  const combos = useMemo(() => allServices.filter(isCombo), [allServices]);
  const dealCards = useMemo(() => {
    const fromCombos = combos
      .map((svc) => {
        const p = comboPricing(svc, allServices);
        return { kind: 'combo' as const, svc, ...p };
      })
      .filter((d) => d.off > 0 || d.sale > 0);
    if (fromCombos.length) return fromCombos.slice(0, 8);
    return popularServices.slice(0, 6).map((svc) => {
      const p = couponOnPrice(svc.starting_price, featuredCoupon);
      return { kind: 'service' as const, svc, ...p };
    });
  }, [combos, allServices, popularServices, featuredCoupon]);
  const packageCards = useMemo(() => {
    const rec = packages.filter((p) => p.is_recommended);
    const list = (rec.length ? rec : packages).slice(0, 8);
    return list.map((pkg) => ({
      pkg,
      svc: allServices.find((s) => s.id === pkg.service_id) || null,
    })).filter((x) => x.svc);
  }, [packages, allServices]);

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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('@/assets/images/icon.png')} style={styles.headerLogo} />
            <View>
              <Text style={styles.headerGreeting}>GharMitra</Text>
              {editingCity ? (
                <View style={styles.cityEditRow}>
                  <TextInput
                    style={styles.cityInput}
                    value={cityDraft}
                    onChangeText={setCityDraft}
                    placeholder="City name"
                    placeholderTextColor={Colors.neutral[400]}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const next = cityDraft.trim();
                      setCity(next);
                      setCustomerCity(next);
                      setEditingCity(false);
                    }}
                  >
                    <Text style={styles.citySave}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.locationTap}
                  onPress={() => {
                    setCityDraft(city);
                    setEditingCity(true);
                  }}
                >
                  <MapPin size={12} color={Colors.primary[700]} />
                  <Text style={styles.headerLocation}>{city || 'City set karein'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(tabs)/bookings')}>
            <Bell size={20} color={Colors.neutral[700]} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Search size={20} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a service..."
            placeholderTextColor={Colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (search.trim()) router.push({ pathname: '/(tabs)/services', params: { q: search.trim() } });
            }}
          />
        </View>
        {searchHits.length > 0 ? (
          <View style={styles.searchHits}>
            {searchHits.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.searchHit}
                onPress={() => router.push(`/service/${svc.id}`)}
              >
                <Text style={styles.searchHitText}>{svc.name}</Text>
                <ChevronRight size={16} color={Colors.neutral[400]} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/services', params: { q: search.trim() } })}
            >
              <Text style={styles.searchMore}>Saari results dekhein</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>Professional Home Services</Text>
                <Text style={styles.bannerSubtitle}>Reliable. Affordable. Fast.</Text>
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

        {liveOffers.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Discount offers</Text>
                <Text style={styles.sectionHint}>Admin se on/off · timeline ke andar</Text>
              </View>
            </View>
            {liveOffers.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={styles.promoCard}
                onPress={() => router.push('/(tabs)/services')}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoEyebrow}>{offerDiscountLabel(o)}</Text>
                  <Text style={styles.promoTitle}>{o.title}</Text>
                  {o.subtitle ? <Text style={styles.promoSub}>{o.subtitle}</Text> : null}
                  {o.code ? <Text style={styles.promoCode}>Code: {o.code}</Text> : null}
                </View>
                <DealCountdown compact endsAt={o.ends_at ? new Date(o.ends_at).getTime() : null} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

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

        {dealCards.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Limited time deals</Text>
                <Text style={styles.sectionHint}>Aaj raat 11:59 tak</Text>
              </View>
              <DealCountdown compact endsAt={liveOffers[0]?.ends_at ? new Date(liveOffers[0].ends_at).getTime() : null} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {dealCards.map((d) => (
                <TouchableOpacity
                  key={`${d.kind}-${d.svc.id}`}
                  style={styles.dealCard}
                  onPress={() => router.push(`/service/${d.svc.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dealImgWrap}>
                    <CatalogImage name={d.svc.name} imageUrl={d.svc.image_url} style={styles.dealImg} />
                    {d.off > 0 ? (
                      <View style={styles.dealOffTag}>
                        <Text style={styles.dealOffText}>{d.off}% OFF</Text>
                      </View>
                    ) : featuredCoupon ? (
                      <View style={styles.dealOffTag}>
                        <Text style={styles.dealOffText}>{featuredCoupon.code}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.popularInfo}>
                    <Text style={styles.dealKind}>{d.kind === 'combo' ? 'Combo deal' : 'Today only'}</Text>
                    <Text style={styles.popularName} numberOfLines={1}>{d.svc.name}</Text>
                    <PriceTag sale={d.sale} mrp={d.mrp} off={d.off} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

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
                  {(() => {
                    if (isCombo(svc)) {
                      const p = comboPricing(svc, allServices);
                      return <PriceTag sale={p.sale} mrp={p.mrp} off={p.off} />;
                    }
                    const p = couponOnPrice(svc.starting_price, featuredCoupon);
                    return <PriceTag sale={p.sale} mrp={p.mrp} off={p.off} />;
                  })()}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {combos.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Combo offers</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {combos.map((svc) => {
              const p = comboPricing(svc, allServices);
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={styles.comboCard}
                  onPress={() => router.push(`/service/${svc.id}`)}
                  activeOpacity={0.85}
                >
                  <CatalogImage name={svc.name} imageUrl={svc.image_url} style={styles.comboImg} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.comboBadge}><Text style={styles.comboBadgeText}>PACKAGE / COMBO</Text></View>
                    <Text style={styles.comboName}>{svc.name}</Text>
                    <Text style={styles.comboParts} numberOfLines={2}>
                      {p.names.length ? p.names.join(' + ') : parseService(svc).description}
                    </Text>
                    <PriceTag sale={p.sale} mrp={p.mrp} off={p.off} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {packageCards.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Packages</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {packageCards.map(({ pkg, svc }) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={styles.pkgCard}
                  onPress={() => router.push(`/service/${svc!.id}`)}
                  activeOpacity={0.85}
                >
                  {pkg.is_recommended ? (
                    <View style={styles.recTag}><Text style={styles.recTagText}>Recommended</Text></View>
                  ) : null}
                  <Text style={styles.pkgService} numberOfLines={1}>{svc!.name}</Text>
                  <Text style={styles.pkgName} numberOfLines={2}>{pkg.name}</Text>
                  <Text style={styles.pkgDur}>{pkg.duration}</Text>
                  <PriceTag sale={Number(pkg.price || 0)} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {featuredCoupon ? (
          <TouchableOpacity
            style={styles.offerBanner}
            onPress={() => router.push('/(tabs)/services')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.offerTitle}>{featuredCoupon.code}</Text>
              <Text style={styles.offerSubtitle}>
                {couponLabel(featuredCoupon)}
                {featuredCoupon.min_amount ? ` · min ₹${featuredCoupon.min_amount}` : ''} · checkout pe apply
              </Text>
            </View>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{couponLabel(featuredCoupon)}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {recentBooking ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Booking</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.recentCard}
              onPress={() => router.push(`/booking/${recentBooking.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{recentBooking.service_name}</Text>
                <Text style={styles.recentMeta}>
                  {recentBooking.scheduled_date} · {recentBooking.scheduled_time}
                </Text>
              </View>
              <View style={styles.recentStatus}>
                <Text style={styles.recentStatusText}>
                  {recentBooking.status === 'in_progress'
                    ? 'In Progress'
                    : recentBooking.status.charAt(0).toUpperCase() + recentBooking.status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: Spacing.xxl + 24 }} />
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
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.neutral[900],
    paddingVertical: 0,
  },
  searchHits: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingVertical: Spacing.xs,
  },
  searchHit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  searchHitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  searchMore: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[700],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  locationTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cityEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cityInput: {
    minWidth: 120,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary[600],
    fontSize: 13,
    color: Colors.neutral[800],
    paddingVertical: 0,
  },
  citySave: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[700],
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing.sm,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  recentMeta: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  recentStatus: {
    backgroundColor: Colors.success[50],
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success[700],
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
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
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
  sectionHint: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.neutral[900],
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 10,
  },
  promoEyebrow: { fontSize: 11, fontWeight: '800', color: Colors.accent[400], letterSpacing: 0.4 },
  promoTitle: { fontSize: 18, fontWeight: '800', color: Colors.neutral[0], marginTop: 4 },
  promoSub: { fontSize: 13, color: Colors.neutral[300], marginTop: 4 },
  promoCode: { fontSize: 12, fontWeight: '700', color: Colors.neutral[0], marginTop: 8 },
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
    borderRadius: 35,
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
  dealCard: {
    width: 210,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  dealImgWrap: { position: 'relative' },
  dealImg: { width: '100%', height: 118, resizeMode: 'cover' },
  dealOffTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.error[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealOffText: { color: Colors.neutral[0], fontSize: 11, fontWeight: '800' },
  dealKind: { fontSize: 11, fontWeight: '700', color: Colors.accent[600], textTransform: 'uppercase' },
  comboCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 10,
  },
  comboImg: { width: 88, height: 88, borderRadius: Radius.md },
  comboBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutral[900],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  comboBadgeText: { color: Colors.neutral[0], fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  comboName: { fontSize: 15, fontWeight: '800', color: Colors.neutral[900] },
  comboParts: { fontSize: 12, color: Colors.neutral[500], marginTop: 4, lineHeight: 16 },
  pkgCard: {
    width: 180,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  recTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  recTagText: { fontSize: 10, fontWeight: '800', color: Colors.accent[700] },
  pkgService: { fontSize: 11, color: Colors.neutral[500], fontWeight: '600' },
  pkgName: { fontSize: 15, fontWeight: '800', color: Colors.neutral[900], marginTop: 4, minHeight: 40 },
  pkgDur: { fontSize: 12, color: Colors.neutral[500], marginTop: 4 },
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
