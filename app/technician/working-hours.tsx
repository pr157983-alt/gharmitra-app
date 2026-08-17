import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Clock, Save, CheckCircle2 } from 'lucide-react-native';
import { supabase, WorkingHour } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

export default function WorkingHoursScreen() {
  const [rows, setRows] = useState<DayRow[]>(
    days.map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '18:00', is_available: i >= 1 && i <= 6 }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [techId, setTechId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = sessionStorage.getItem('tech_id');
      if (!id) {
        router.replace('/technician/login');
        return;
      }
      setTechId(id);
    }
  }, []);

  const loadHours = useCallback(async () => {
    if (!techId) return;
    try {
      const { data } = await supabase
        .from('technician_working_hours')
        .select('*')
        .eq('technician_id', techId)
        .order('day_of_week', { ascending: true });

      if (data && data.length > 0) {
        const updated = rows.map((r) => {
          const found = data.find((d: WorkingHour) => d.day_of_week === r.day_of_week);
          if (found) {
            return {
              day_of_week: found.day_of_week,
              start_time: found.start_time,
              end_time: found.end_time,
              is_available: found.is_available,
            };
          }
          return r;
        });
        setRows(updated);
      }
    } catch {
      // network error
    }
    setLoading(false);
  }, [techId]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const toggleDay = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, is_available: !r.is_available } : r));
  };

  const updateTime = (idx: number, field: 'start_time' | 'end_time', value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!techId) return;
    setSaving(true);
    setSaved(false);

    try {
      await supabase
        .from('technician_working_hours')
        .delete()
        .eq('technician_id', techId);

      const inserts = rows
        .filter((r) => r.is_available)
        .map((r) => ({
          technician_id: techId,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
          is_available: true,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from('technician_working_hours').insert(inserts);
        if (error) {
          Alert.alert('Error', 'Save nahi hua. Phir try karein.');
          setSaving(false);
          return;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Save nahi hua. Phir try karein.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Working Hours</Text>
            <Text style={styles.headerSubtitle}>Apni availability set karein</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {rows.map((row, idx) => (
          <View key={idx} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <TouchableOpacity
                style={[styles.toggle, row.is_available && styles.toggleActive]}
                onPress={() => toggleDay(idx)}
              >
                <View style={[styles.toggleDot, row.is_available && styles.toggleDotActive]} />
              </TouchableOpacity>
              <Text style={[styles.dayName, !row.is_available && styles.dayNameOff]}>
                {days[idx]}
              </Text>
            </View>

            {row.is_available && (
              <View style={styles.timeRow}>
                <View style={styles.timeInputWrap}>
                  <Clock size={14} color={Colors.neutral[400]} />
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => updateTime(idx, 'start_time', e.target.value)}
                    style={{
                      fontSize: 14,
                      color: Colors.neutral[900],
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      flex: 1,
                      marginLeft: 6,
                    }}
                  />
                </View>
                <Text style={styles.timeDash}>—</Text>
                <View style={styles.timeInputWrap}>
                  <Clock size={14} color={Colors.neutral[400]} />
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => updateTime(idx, 'end_time', e.target.value)}
                    style={{
                      fontSize: 14,
                      color: Colors.neutral[900],
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      flex: 1,
                      marginLeft: 6,
                    }}
                  />
                </View>
              </View>
            )}

            {!row.is_available && (
              <Text style={styles.offText}>Off — Is din available nahi</Text>
            )}
          </View>
        ))}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {saved && (
          <View style={styles.savedBadge}>
            <CheckCircle2 size={16} color={Colors.success[600]} />
            <Text style={styles.savedText}>Saved!</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : (
            <>
              <Save size={18} color={Colors.neutral[0]} />
              <Text style={styles.saveBtnText}>Save Hours</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[0],
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral[200],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  listContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  dayCard: {
    backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.neutral[200],
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: Colors.primary[600] },
  toggleDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.neutral[0],
    shadowColor: Colors.neutral[900], shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  toggleDotActive: { alignSelf: 'flex-end' },
  dayName: { fontSize: 16, fontWeight: '700', color: Colors.neutral[900] },
  dayNameOff: { color: Colors.neutral[400] },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  timeInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  timeDash: { fontSize: 16, color: Colors.neutral[400] },
  offText: { fontSize: 13, color: Colors.neutral[400], marginTop: Spacing.xs },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, backgroundColor: Colors.neutral[0], borderTopWidth: 1, borderTopColor: Colors.neutral[200],
  },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: 14, fontWeight: '700', color: Colors.success[600] },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingVertical: Spacing.sm + 2, borderRadius: Radius.md,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
});
