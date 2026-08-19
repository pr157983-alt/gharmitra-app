import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MapPin, Trash2 } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import {
  deleteSavedAddress,
  readSavedAddresses,
  upsertSavedAddress,
  type SavedAddress,
} from '@/lib/customerSession';

export default function CustomerAddressesScreen() {
  const [list, setList] = useState<SavedAddress[]>(() => readSavedAddresses());
  const [label, setLabel] = useState('Home');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  const refresh = () => setList(readSavedAddresses());

  const add = () => {
    if (!line.trim()) return;
    upsertSavedAddress({ label, line, city, pincode });
    setLine('');
    setCity('');
    setPincode('');
    refresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved addresses</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {list.map((a) => (
          <View key={a.id} style={styles.card}>
            <MapPin size={18} color={Colors.primary[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{a.label}</Text>
              <Text style={styles.line}>{[a.line, a.city, a.pincode].filter(Boolean).join(', ')}</Text>
            </View>
            <TouchableOpacity onPress={() => { deleteSavedAddress(a.id); refresh(); }}>
              <Trash2 size={18} color={Colors.error[600]} />
            </TouchableOpacity>
          </View>
        ))}
        {list.length === 0 ? <Text style={styles.empty}>Abhi koi saved address nahi. Booking pe save hota hai, yahan bhi add kar sakte ho.</Text> : null}

        <Text style={styles.h2}>Naya address</Text>
        <View style={styles.chips}>
          {['Home', 'Office', 'Other'].map((l) => (
            <TouchableOpacity key={l} style={[styles.chip, label === l && styles.chipOn]} onPress={() => setLabel(l)}>
              <Text style={[styles.chipText, label === l && styles.chipTextOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Full address" value={line} onChangeText={setLine} placeholderTextColor={Colors.neutral[400]} />
        <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} placeholderTextColor={Colors.neutral[400]} />
        <TextInput style={styles.input} placeholder="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" maxLength={6} placeholderTextColor={Colors.neutral[400]} />
        <TouchableOpacity style={styles.btn} onPress={add}>
          <Text style={styles.btnText}>Save address</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200], gap: Spacing.sm,
  },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.neutral[900] },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: 10,
  },
  label: { fontWeight: '800', color: Colors.neutral[900] },
  line: { color: Colors.neutral[600], marginTop: 4, fontSize: 13, lineHeight: 18 },
  empty: { color: Colors.neutral[500], marginBottom: 16, lineHeight: 20 },
  h2: { fontWeight: '800', fontSize: 15, marginTop: 8, marginBottom: 10, color: Colors.neutral[800] },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[0] },
  chipOn: { backgroundColor: Colors.neutral[800], borderColor: Colors.neutral[800] },
  chipText: { fontWeight: '700', fontSize: 12, color: Colors.neutral[600] },
  chipTextOn: { color: Colors.neutral[0] },
  input: {
    borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, backgroundColor: Colors.neutral[0], color: Colors.neutral[900],
  },
  btn: { backgroundColor: Colors.neutral[800], paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center', marginTop: 4 },
  btnText: { color: Colors.neutral[0], fontWeight: '800' },
});
