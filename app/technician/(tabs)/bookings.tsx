import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { useTechBookings } from '@/lib/useTechBookings';
import { jobAreaLabel, isJobAccepted, parseJobMeta } from '@/lib/jobMeta';

export default function TechnicianBookingsTab() {
  const data = useTechBookings();
  const all = [...data.active, ...data.completed, ...data.newJobs.filter((j) => !data.active.find((a) => a.id === j.id) && !data.completed.find((c) => c.id === j.id))];

  if (data.loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bookings</Text>
      <ScrollView refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.onRefresh} />} contentContainerStyle={styles.scroll}>
        {all.length === 0 ? (
          <Text style={styles.empty}>Koi booking nahi</Text>
        ) : (
          all.map((b) => {
            const accepted = isJobAccepted(b.status);
            const stage = parseJobMeta(b.notes).meta.tech_stage || b.status;
            return (
              <TouchableOpacity key={b.id} style={styles.card} onPress={() => router.push(`/technician/job/${b.id}`)}>
                <Text style={styles.name}>{b.service_name}</Text>
                <Text style={styles.muted}>
                  {accepted ? `${b.customer_name} · ${b.address}` : `${b.customer_name.split(' ')[0]} · ${jobAreaLabel(b.notes)}`}
                </Text>
                <Text style={styles.muted}>{b.scheduled_date}</Text>
                <Text style={styles.stage}>{accepted ? String(stage).replace('_', ' ') : 'Accept pending'}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  scroll: { padding: Spacing.lg },
  empty: { color: Colors.neutral[400], textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: Colors.neutral[200] },
  name: { fontSize: 16, fontWeight: '800', color: Colors.neutral[900] },
  muted: { fontSize: 13, color: Colors.neutral[500], marginTop: 4 },
  stage: { marginTop: 8, fontSize: 12, fontWeight: '700', color: Colors.primary[700], textTransform: 'capitalize' },
});
