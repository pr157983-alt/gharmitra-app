import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Phone, ShieldCheck, Clock, BadgePercent, HelpCircle } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function CustomerHelpScreen() {
  const [open, setOpen] = useState<string | null>('book');

  const rows = [
    {
      id: 'book',
      title: 'Service kaise book karein?',
      body: 'Home ya Services pe category chunein, package + add-ons select karein, date/time, address, city aur pincode daalein. Promo code ho to booking pe lagayein.',
    },
    {
      id: 'cancel',
      title: 'Booking cancel / reschedule',
      body: 'My Bookings se booking kholein. Cancel/reschedule admin confirm karega. Reason dena zaroori hai.',
    },
    {
      id: 'pay',
      title: 'Payment',
      body: 'Unpaid, Cash on Delivery, ya UPI. Job complete ke baad bill mein service, add-ons, visiting fee aur coupon dikhega.',
    },
    {
      id: 'warranty',
      title: 'Warranty / safety',
      body: 'Completed job pe 30 din warranty. Same problem ho to free visit. Technician verified professionals hain. Pehle/baad photo bill pe milti hai.',
    },
  ];

  const call = useCallback(() => {
    Linking.openURL('tel:18001234567');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <TouchableOpacity style={styles.callCard} onPress={call} activeOpacity={0.8}>
          <Phone size={20} color={Colors.neutral[0]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.callTitle}>Helpline</Text>
            <Text style={styles.callSub}>1800-123-4567 · 9 AM – 8 PM</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.trust}>
          <View style={styles.trustItem}>
            <ShieldCheck size={18} color={Colors.primary[600]} />
            <Text style={styles.trustText}>Verified staff</Text>
          </View>
          <View style={styles.trustItem}>
            <Clock size={18} color={Colors.primary[600]} />
            <Text style={styles.trustText}>On-time visit</Text>
          </View>
          <View style={styles.trustItem}>
            <BadgePercent size={18} color={Colors.primary[600]} />
            <Text style={styles.trustText}>Promo on booking</Text>
          </View>
        </View>

        {rows.map((r) => (
          <TouchableOpacity key={r.id} style={styles.faq} onPress={() => setOpen(open === r.id ? null : r.id)}>
            <View style={styles.faqHead}>
              <HelpCircle size={16} color={Colors.primary[600]} />
              <Text style={styles.faqTitle}>{r.title}</Text>
            </View>
            {open === r.id && <Text style={styles.faqBody}>{r.body}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  callTitle: { color: Colors.neutral[0], fontWeight: '800', fontSize: 16 },
  callSub: { color: Colors.neutral[0], opacity: 0.9, marginTop: 2 },
  trust: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  trustItem: { flex: 1, backgroundColor: Colors.neutral[0], borderRadius: Radius.md, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.neutral[200] },
  trustText: { fontSize: 11, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  faq: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqTitle: { fontWeight: '700', color: Colors.neutral[900], flex: 1 },
  faqBody: { marginTop: 8, color: Colors.neutral[600], fontSize: 13, lineHeight: 20 },
});
