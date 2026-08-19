import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, BadgePercent } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { DealCountdown } from '@/components/DealCountdown';
import { loadCoupons, loadPromoOffers, livePromoOffers, offerDiscountLabel, offerStatus } from '@/lib/offers';
import type { Coupon, PromoOffer } from '@/lib/catalogMeta';

export default function CustomerOffersScreen() {
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [o, c] = await Promise.all([loadPromoOffers(), loadCoupons()]);
    setOffers(o);
    setCoupons(c.filter((x) => x.enabled !== false));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const live = livePromoOffers(offers);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Offers & coupons</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary[600]} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.h2}>Live offers</Text>
          {live.length === 0 ? (
            <Text style={styles.empty}>Abhi koi live offer nahi. Admin ON + timeline ke andar hone par yahan dikhega.</Text>
          ) : null}
          {live.map((o) => (
            <View key={o.id} style={styles.promo}>
              <Text style={styles.off}>{offerDiscountLabel(o)}</Text>
              <Text style={styles.promoTitle}>{o.title}</Text>
              {o.subtitle ? <Text style={styles.promoSub}>{o.subtitle}</Text> : null}
              {o.code ? <Text style={styles.promoCode}>Code: {o.code}</Text> : null}
              <View style={{ marginTop: 10 }}>
                <DealCountdown compact endsAt={o.ends_at ? new Date(o.ends_at).getTime() : null} />
              </View>
            </View>
          ))}

          <Text style={styles.h2}>Checkout coupons</Text>
          {coupons.length === 0 ? <Text style={styles.empty}>Koi coupon code nahi.</Text> : null}
          {coupons.map((c) => (
            <View key={c.id} style={styles.coupon}>
              <BadgePercent size={18} color={Colors.primary[700]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.meta}>
                  {c.percent ? `${c.percent}%` : `₹${c.flat}`} off
                  {c.min_amount ? ` · min ₹${c.min_amount}` : ''} · booking pe lagao
                </Text>
              </View>
            </View>
          ))}
          {offers.filter((o) => offerStatus(o) !== 'live').length > 0 ? (
            <Text style={styles.hint}>Off / scheduled / expired offers yahan nahi dikhte.</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
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
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  h2: { fontWeight: '800', fontSize: 16, marginBottom: 10, marginTop: 8, color: Colors.neutral[800] },
  empty: { color: Colors.neutral[500], marginBottom: 16, lineHeight: 20 },
  promo: { backgroundColor: Colors.neutral[900], borderRadius: Radius.lg, padding: 16, marginBottom: 10 },
  off: { color: Colors.accent[400], fontWeight: '800', fontSize: 12 },
  promoTitle: { color: Colors.neutral[0], fontWeight: '800', fontSize: 18, marginTop: 4 },
  promoSub: { color: Colors.neutral[300], marginTop: 4, fontSize: 13 },
  promoCode: { color: Colors.neutral[0], fontWeight: '800', marginTop: 8 },
  coupon: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 8,
  },
  code: { fontWeight: '800', color: Colors.neutral[900] },
  meta: { color: Colors.neutral[500], marginTop: 4, fontSize: 13 },
  hint: { fontSize: 12, color: Colors.neutral[400], marginTop: 12 },
});
