import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AdminColors, getAdminRole } from '@/lib/admin';
import { useMemo } from 'react';

export default function AdminProfileScreen() {
  const role = useMemo(() => getAdminRole() || 'super', []);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Profile</Text>
      <View style={styles.card}>
        <View style={styles.av}>
          <Text style={styles.avText}>A</Text>
        </View>
        <Text style={styles.name}>Admin</Text>
        <Text style={styles.role}>{role === 'viewer' ? 'Co-Admin (read-only)' : 'Super Admin'}</Text>
        <Text style={styles.meta}>Ghar Mitra · Home Services</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: AdminColors.border, alignItems: 'center', maxWidth: 420 },
  av: { width: 72, height: 72, borderRadius: 36, backgroundColor: AdminColors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 28, fontWeight: '800', color: AdminColors.purple },
  name: { fontSize: 20, fontWeight: '800', marginTop: 12, color: AdminColors.text },
  role: { color: AdminColors.purple, fontWeight: '700', marginTop: 4 },
  meta: { color: AdminColors.muted, marginTop: 8 },
});
