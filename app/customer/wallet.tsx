import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { addWalletMoney, readCustomerSession, readWalletBalance, readWalletTx, type WalletTx } from '@/lib/customerSession';
import { formatINR } from '@/lib/admin';

export default function CustomerWalletScreen() {
  const s = readCustomerSession();
  const [bal, setBal] = useState(0);
  const [tx, setTx] = useState<WalletTx[]>([]);

  const refresh = useCallback(() => {
    setBal(readWalletBalance());
    setTx(readWalletTx());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const add = (n: number) => {
    addWalletMoney(n, `Add money ₹${n}`);
    refresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.balCard}>
          <Wallet size={22} color={Colors.neutral[0]} />
          <Text style={styles.balLabel}>Available balance</Text>
          <Text style={styles.bal}>{formatINR(bal)}</Text>
          <Text style={styles.balHint}>{s.phone ? `+91 ${s.phone}` : 'Login ke baad wallet use karo'}</Text>
        </View>
        <Text style={styles.h2}>Add money</Text>
        <View style={styles.row}>
          {[100, 200, 500, 1000].map((n) => (
            <TouchableOpacity key={n} style={styles.chip} onPress={() => add(n)}>
              <Text style={styles.chipText}>+₹{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.note}>Demo wallet — amount is device pe save. Payment gateway baad mein.</Text>
        <Text style={styles.h2}>History</Text>
        {tx.length === 0 ? <Text style={styles.empty}>Abhi koi transaction nahi.</Text> : null}
        {tx.map((t) => (
          <View key={t.id} style={styles.tx}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txNote}>{t.note}</Text>
              <Text style={styles.txAt}>{new Date(t.at).toLocaleString()}</Text>
            </View>
            <Text style={styles.txAmt}>+{formatINR(t.amount)}</Text>
          </View>
        ))}
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
  body: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  balCard: {
    backgroundColor: Colors.neutral[800],
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  balLabel: { color: Colors.neutral[300], marginTop: 10, fontSize: 13 },
  bal: { color: Colors.neutral[0], fontSize: 32, fontWeight: '800', marginTop: 4 },
  balHint: { color: Colors.neutral[400], marginTop: 8, fontSize: 12 },
  h2: { fontWeight: '800', marginBottom: 10, color: Colors.neutral[800] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { fontWeight: '800', color: Colors.neutral[800] },
  note: { fontSize: 12, color: Colors.neutral[500], marginBottom: 20, lineHeight: 18 },
  empty: { color: Colors.neutral[500] },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 8,
  },
  txNote: { fontWeight: '700', color: Colors.neutral[800] },
  txAt: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  txAmt: { fontWeight: '800', color: Colors.success[700] },
});
