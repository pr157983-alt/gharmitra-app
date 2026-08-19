import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { readCustomerSession, setCustomerCity } from '@/lib/customerSession';

export default function CustomerSettingsScreen() {
  const s = readCustomerSession();
  const [city, setCity] = useState(s.city);
  const [saved, setSaved] = useState('');

  const save = () => {
    setCustomerCity(city);
    setSaved('City save ho gayi.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Home city</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Patna, Lucknow..."
          placeholderTextColor={Colors.neutral[400]}
        />
        <TouchableOpacity style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>
        {saved ? <Text style={styles.ok}>{saved}</Text> : null}

        <Text style={styles.note}>
          Notifications, language aur email baad mein. Phone / naam login se aate hain.
        </Text>
        <Text style={styles.ver}>GharMitra customer · v1.0.0</Text>
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
  body: { padding: Spacing.lg },
  label: { fontWeight: '700', marginBottom: 8, color: Colors.neutral[700] },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.neutral[0],
    color: Colors.neutral[900],
  },
  btn: {
    marginTop: 12,
    backgroundColor: Colors.neutral[800],
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  btnText: { color: Colors.neutral[0], fontWeight: '800' },
  ok: { marginTop: 10, color: Colors.success[700], fontWeight: '700' },
  note: { marginTop: 24, color: Colors.neutral[500], lineHeight: 20, fontSize: 13 },
  ver: { marginTop: 16, color: Colors.neutral[400], fontSize: 12 },
});
