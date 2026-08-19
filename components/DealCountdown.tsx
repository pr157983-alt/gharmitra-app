import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { endOfTodayMs, splitCountdown } from '@/lib/deals';
import { Colors, Radius } from '@/lib/theme';

export function DealCountdown({ compact, endsAt }: { compact?: boolean; endsAt?: number | null }) {
  const target = endsAt && endsAt > 0 ? endsAt : endOfTodayMs();
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    const tick = () => setLeft((endsAt && endsAt > 0 ? endsAt : endOfTodayMs()) - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const { ended, h, m, s } = splitCountdown(left);
  if (ended) {
    return <Text style={styles.ended}>Offer ended</Text>;
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {!compact ? <Text style={styles.label}>Ends in</Text> : null}
      <View style={styles.box}><Text style={styles.num}>{h}</Text></View>
      <Text style={styles.colon}>:</Text>
      <View style={styles.box}><Text style={styles.num}>{m}</Text></View>
      <Text style={styles.colon}>:</Text>
      <View style={styles.box}><Text style={styles.num}>{s}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCompact: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.neutral[600], marginRight: 4 },
  box: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.neutral[900],
    alignItems: 'center',
  },
  num: { fontSize: 13, fontWeight: '800', color: Colors.neutral[0], fontVariant: ['tabular-nums'] },
  colon: { fontSize: 14, fontWeight: '800', color: Colors.neutral[800] },
  ended: { fontSize: 12, fontWeight: '700', color: Colors.neutral[500] },
});
