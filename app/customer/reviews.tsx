import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { supabase, Booking } from '@/lib/supabase';
import { readCustomerSession } from '@/lib/customerSession';
import { parseJobMeta } from '@/lib/jobMeta';

export default function CustomerReviewsScreen() {
  const [rows, setRows] = useState<{ booking: Booking; rating: number; text: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = readCustomerSession();
    if (!s.id && !s.phone) {
      setRows([]);
      setLoading(false);
      return;
    }
    let q = supabase.from('bookings').select('*').eq('status', 'completed').order('created_at', { ascending: false });
    if (s.id && s.phone) q = q.or(`customer_id.eq.${s.id},phone.eq.${s.phone}`);
    else if (s.id) q = q.eq('customer_id', s.id);
    else q = q.eq('phone', s.phone);
    const { data } = await q;
    const list = ((data as Booking[]) || [])
      .map((b) => {
        const m = parseJobMeta(b.notes).meta;
        return { booking: b, rating: Number(m.customer_rating || 0), text: m.customer_review || '' };
      })
      .filter((x) => x.rating > 0);
    setRows(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>My reviews</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary[600]} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Abhi koi review nahi. Completed job pe stars dekar yahan dikhega.</Text>
          ) : null}
          {rows.map((r) => (
            <TouchableOpacity key={r.booking.id} style={styles.card} onPress={() => router.push(`/booking/${r.booking.id}`)}>
              <Text style={styles.name}>{r.booking.service_name}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} color={Colors.accent[500]} fill={n <= r.rating ? Colors.accent[500] : 'transparent'} />
                ))}
              </View>
              {r.text ? <Text style={styles.text}>{r.text}</Text> : null}
              <Text style={styles.meta}>{r.booking.scheduled_date}</Text>
            </TouchableOpacity>
          ))}
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
  body: { padding: Spacing.lg },
  empty: { color: Colors.neutral[500], lineHeight: 20 },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 10,
  },
  name: { fontWeight: '800', color: Colors.neutral[900], fontSize: 15 },
  stars: { flexDirection: 'row', gap: 4, marginTop: 8 },
  text: { marginTop: 8, color: Colors.neutral[600], fontSize: 13, lineHeight: 18 },
  meta: { marginTop: 8, fontSize: 12, color: Colors.neutral[400] },
});
