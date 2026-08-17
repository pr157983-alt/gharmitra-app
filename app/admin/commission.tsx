import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminColors } from '@/lib/admin';

export default function CommissionScreen() {
  const [rate, setRate] = useState('20');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<'super' | 'viewer'>('super');

  const load = useCallback(async () => {
    const { data } = await supabase.from('admin_settings').select('commission_rate').limit(1).maybeSingle();
    if (data?.commission_rate !== undefined) setRate(String(data.commission_rate));
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      setRole((sessionStorage.getItem('admin_role') as 'super' | 'viewer') || 'super');
    } catch {
      /* ignore */
    }
    load();
  }, [load]);

  const save = async () => {
    const n = parseFloat(rate);
    if (isNaN(n) || n < 0 || n > 100) {
      Alert.alert('Error', 'Commission 0 se 100 ke beech honi chahiye');
      return;
    }
    setSaving(true);
    const { data } = await supabase.from('admin_settings').select('id').limit(1).maybeSingle();
    if (data) {
      await supabase.from('admin_settings').update({ commission_rate: n }).eq('id', data.id);
    }
    setSaving(false);
    Alert.alert('Saved', `Commission rate ${n}% set ho gayi.`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Commission Rates</Text>
      <Text style={styles.sub}>Yeh rate naye technician payouts par lagti hai.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Platform commission (%)</Text>
        <TextInput
          style={styles.input}
          value={rate}
          onChangeText={setRate}
          keyboardType="numeric"
          editable={role === 'super'}
        />
        {role === 'super' ? (
          <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save rate'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.sub}>Viewer PIN se rate change nahi ho sakti.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: AdminColors.border, maxWidth: 480 },
  label: { fontWeight: '700', marginBottom: 8, color: AdminColors.text },
  input: { borderWidth: 1, borderColor: AdminColors.border, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: AdminColors.bg },
  btn: { marginTop: 14, backgroundColor: AdminColors.purple, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});
