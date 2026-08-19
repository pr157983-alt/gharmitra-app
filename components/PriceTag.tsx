import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

export function PriceTag({
  sale,
  mrp,
  off,
  suffix,
}: {
  sale: number;
  mrp?: number;
  off?: number;
  suffix?: string;
}) {
  const showStrike = Boolean(mrp && mrp > sale && sale >= 0);
  return (
    <View style={styles.wrap}>
      <Text style={styles.sale}>
        ₹{sale}
        {suffix || ''}
      </Text>
      {showStrike ? <Text style={styles.mrp}>₹{mrp}</Text> : null}
      {showStrike && off ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{off}% OFF</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  sale: { fontSize: 15, fontWeight: '800', color: Colors.primary[700] },
  mrp: {
    fontSize: 13,
    color: Colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.success[700] },
});
