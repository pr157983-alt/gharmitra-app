import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Clock, TrendingUp, LogOut, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { clearTechSession, readTechSession } from '@/lib/techSession';

export default function TechnicianProfileTab() {
  const s = readTechSession();

  const logout = () => {
    clearTechSession();
    router.replace('/technician/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.hero}>
          <View style={styles.av}>
            <Text style={styles.avTxt}>{(s.name || 'T').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{s.name || 'Technician'}</Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/technician/working-hours')}>
          <Clock size={18} color={Colors.primary[600]} />
          <Text style={styles.rowTxt}>Working hours</Text>
          <ChevronRight size={16} color={Colors.neutral[300]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/technician/performance')}>
          <TrendingUp size={18} color={Colors.primary[600]} />
          <Text style={styles.rowTxt}>Performance</Text>
          <ChevronRight size={16} color={Colors.neutral[300]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.out} onPress={logout}>
          <LogOut size={18} color={Colors.error[500]} />
          <Text style={styles.outTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  scroll: { padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.lg },
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  av: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  avTxt: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { marginTop: 12, fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.neutral[200] },
  rowTxt: { flex: 1, fontWeight: '700', color: Colors.neutral[800] },
  out: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 14 },
  outTxt: { color: Colors.error[500], fontWeight: '800' },
});
