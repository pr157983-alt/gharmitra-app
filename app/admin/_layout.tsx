import { Slot, usePathname } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminColors } from '@/lib/admin';

export default function AdminLayout() {
  const pathname = usePathname();
  const isLogin = pathname?.includes('login');

  if (isLogin) return <Slot />;

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.mobile}>
        <Text style={styles.mobileTitle}>Admin panel web pe kholein</Text>
        <Text style={styles.mobileText}>
          Yeh dashboard desktop browser (Chrome) ke liye hai. Expo web start karke Admin Portal open karein.
        </Text>
      </View>
    );
  }

  return <AdminShell />;
}

const styles = StyleSheet.create({
  mobile: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: AdminColors.bg },
  mobileTitle: { fontSize: 20, fontWeight: '800', color: AdminColors.text, marginBottom: 8 },
  mobileText: { fontSize: 14, color: AdminColors.muted, lineHeight: 22 },
});
