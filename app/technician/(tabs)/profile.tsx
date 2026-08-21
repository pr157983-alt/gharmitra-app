import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Clock, TrendingUp, LogOut, ChevronRight, Camera, Star } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { clearTechSession, pickWebImage, readTechSession, saveTechPhoto } from '@/lib/techSession';
import { useTechBookings } from '@/lib/useTechBookings';

export default function TechnicianProfileTab() {
  const s = readTechSession();
  const jobs = useTechBookings();
  const [photo, setPhoto] = useState(s.photo || '');

  const logout = () => {
    clearTechSession();
    router.replace('/technician/login');
  };

  const changePhoto = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Photo', 'Photo change abhi web pe available hai.');
      return;
    }
    const url = await pickWebImage();
    if (!url || !s.id) return;
    saveTechPhoto(s.id, url);
    setPhoto(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.hero}>
          <TouchableOpacity onPress={changePhoto} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avImg} />
            ) : (
              <View style={styles.av}>
                <Text style={styles.avTxt}>{(s.name || 'T').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cam}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{s.name || 'Technician'}</Text>
          <Text style={styles.hint}>Photo tap karke change karein</Text>
          <View style={styles.rate}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={16}
                color={Colors.accent[500]}
                fill={i <= Math.round(jobs.techRating) ? Colors.accent[500] : 'transparent'}
              />
            ))}
            <Text style={styles.rateTxt}>
              {jobs.techRatingCount ? `${jobs.techRating} (${jobs.techRatingCount} ratings)` : 'Abhi rating nahi'}
            </Text>
          </View>
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
  av: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  avImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.neutral[200] },
  avTxt: { color: '#fff', fontSize: 36, fontWeight: '800' },
  cam: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral[0],
  },
  name: { marginTop: 12, fontSize: 18, fontWeight: '800' },
  hint: { fontSize: 12, color: Colors.neutral[400], marginTop: 4 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  rateTxt: { marginLeft: 6, fontWeight: '700', color: Colors.neutral[700] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.neutral[200] },
  rowTxt: { flex: 1, fontWeight: '700', color: Colors.neutral[800] },
  out: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 14 },
  outTxt: { color: Colors.error[500], fontWeight: '800' },
});
