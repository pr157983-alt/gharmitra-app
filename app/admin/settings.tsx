import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminColors } from '@/lib/admin';

export default function SettingsScreen() {
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [viewerPin, setViewerPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    try {
      setRole((sessionStorage.getItem('admin_role') as 'super' | 'viewer') || 'super');
    } catch {
      /* ignore */
    }
  }, []);

  const savePin = async () => {
    if (newPin.trim() !== confirmPin.trim()) {
      Alert.alert('Error', 'New PIN match nahi karti');
      return;
    }
    setSaving(true);
    const { data } = await supabase.from('admin_settings').select('id, pin').limit(1).maybeSingle();
    if (!data || data.pin !== oldPin.trim()) {
      Alert.alert('Error', 'Current PIN galat hai');
      setSaving(false);
      return;
    }
    const patch: Record<string, string> = { pin: newPin.trim() };
    if (viewerPin.trim()) patch.viewer_pin = viewerPin.trim();
    await supabase.from('admin_settings').update(patch).eq('id', data.id);
    setSaving(false);
    Alert.alert('Saved', 'PIN update ho gayi');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const resetData = async () => {
    setResetting(true);
    await Promise.all([
      supabase.from('technician_payouts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('complaints').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
    setResetting(false);
    Alert.alert('Done', 'Bookings, complaints aur payouts delete ho gaye. Services/technicians safe hain.');
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.sub}>Admin PIN, viewer PIN aur data tools</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>Change PIN</Text>
        {role !== 'super' ? (
          <Text style={styles.sub}>Sirf Super Admin PIN change kar sakta hai.</Text>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="Current PIN" value={oldPin} onChangeText={setOldPin} secureTextEntry />
            <TextInput style={styles.input} placeholder="New PIN" value={newPin} onChangeText={setNewPin} secureTextEntry />
            <TextInput style={styles.input} placeholder="Confirm new PIN" value={confirmPin} onChangeText={setConfirmPin} secureTextEntry />
            <TextInput style={styles.input} placeholder="Viewer PIN (optional)" value={viewerPin} onChangeText={setViewerPin} />
            <TouchableOpacity style={styles.btn} onPress={savePin} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save PIN</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {role === 'super' && (
        <View style={[styles.card, { borderColor: AdminColors.redSoft }]}>
          <Text style={styles.h2}>Danger zone</Text>
          <Text style={styles.sub}>Bookings/complaints/payouts delete. Services delete nahi honge.</Text>
          <TouchableOpacity style={styles.danger} onPress={resetData} disabled={resetting}>
            <Text style={styles.dangerText}>{resetting ? 'Deleting...' : 'Delete operational data'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, gap: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  h2: { fontSize: 16, fontWeight: '800', color: AdminColors.text, marginBottom: 10 },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: AdminColors.border, maxWidth: 520 },
  input: { borderWidth: 1, borderColor: AdminColors.border, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: AdminColors.bg },
  btn: { backgroundColor: AdminColors.purple, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontWeight: '800' },
  danger: { backgroundColor: AdminColors.redSoft, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerText: { color: AdminColors.red, fontWeight: '800' },
});
