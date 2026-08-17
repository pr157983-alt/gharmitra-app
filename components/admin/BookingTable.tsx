import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Booking, Technician } from '@/lib/supabase';
import { AdminColors, formatINR, shortId, statusColor } from '@/lib/admin';
import { parseJobMeta, paymentLabel } from '@/lib/jobMeta';

const COLS = [
  { key: 'id', label: 'ID', flex: 0.7 },
  { key: 'customer', label: 'Customer', flex: 1 },
  { key: 'address', label: 'Address', flex: 1.1 },
  { key: 'mobile', label: 'Mobile No', flex: 0.85 },
  { key: 'service', label: 'Service', flex: 1 },
  { key: 'time', label: 'Time', flex: 0.85 },
  { key: 'tech', label: 'Technician', flex: 0.9 },
  { key: 'status', label: 'Status', flex: 0.75 },
  { key: 'payment', label: 'Payment', flex: 0.75 },
  { key: 'action', label: 'Action', flex: 1.15 },
];

type Props = {
  bookings: Booking[];
  technicians: Technician[];
  role?: 'super' | 'viewer';
  onAssign?: (booking: Booking) => void;
  onStatus?: (id: string, status: string) => void;
};

export function BookingTable({ bookings, technicians, role = 'super', onAssign, onStatus }: Props) {
  const techName = (id: string | null) => technicians.find((t) => t.id === id)?.name || '—';

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {COLS.map((c) => (
          <Text key={c.key} style={[styles.th, { flex: c.flex }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {bookings.map((b) => {
        const st = statusColor(b.status);
        const pay = parseJobMeta(b.notes).meta.payment_status;
        return (
          <View key={b.id} style={styles.tr}>
            <TouchableOpacity style={{ flex: 0.7 }} onPress={() => router.push(`/admin/job/${b.id}`)}>
              <Text style={[styles.td, { fontWeight: '700', color: AdminColors.purple }]}>{shortId(b.id)}</Text>
            </TouchableOpacity>
            <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
              {b.customer_name}
            </Text>
            <Text style={[styles.td, { flex: 1.1 }]} numberOfLines={2}>
              {b.address || '—'}
            </Text>
            <Text style={[styles.td, { flex: 0.85 }]}>{b.phone || '—'}</Text>
            <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
              {b.service_name}
            </Text>
            <Text style={[styles.td, { flex: 0.85 }]}>
              {b.scheduled_date}
              {'\n'}
              {b.scheduled_time}
            </Text>
            <TouchableOpacity style={{ flex: 0.9 }} onPress={() => role === 'super' && onAssign?.(b)} disabled={!onAssign}>
              <Text style={[styles.td, { color: onAssign ? AdminColors.purple : AdminColors.text, fontWeight: '700' }]} numberOfLines={1}>
                {techName(b.technician_id)}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 0.75 }}>
              <View style={[styles.pill, { backgroundColor: st.bg }]}>
                <Text style={[styles.pillText, { color: st.fg }]}>{b.status}</Text>
              </View>
            </View>
            <Text style={[styles.td, { flex: 0.75, fontWeight: '800', color: pay === 'unpaid' || !pay ? AdminColors.red : AdminColors.green }]}>
              {paymentLabel(pay)}
              {'\n'}
              {formatINR(Number(b.total_amount))}
            </Text>
            <View style={{ flex: 1.15, gap: 4 }}>
              <TouchableOpacity style={styles.billBtn} onPress={() => router.push(`/admin/bill/${b.id}`)}>
                <Text style={styles.billBtnText}>Bill Generate</Text>
              </TouchableOpacity>
              {role === 'super' && onStatus ? (
                <View style={styles.statusRow}>
                  {b.status !== 'confirmed' && b.status !== 'in_progress' && (
                    <TouchableOpacity onPress={() => onStatus(b.id, 'in_progress')}>
                      <Text style={[styles.act, { color: AdminColors.blue }]}>Process</Text>
                    </TouchableOpacity>
                  )}
                  {b.status !== 'completed' && (
                    <TouchableOpacity onPress={() => onStatus(b.id, 'completed')}>
                      <Text style={[styles.act, { color: AdminColors.green }]}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  {b.status !== 'cancelled' && (
                    <TouchableOpacity onPress={() => onStatus(b.id, 'cancelled')}>
                      <Text style={[styles.act, { color: AdminColors.red }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...(Platform.OS === 'web' ? ({ overflowX: 'auto' } as object) : null),
    minWidth: 1080,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 8,
  },
  th: { fontSize: 11, fontWeight: '800', color: AdminColors.muted, textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  td: { fontSize: 12, color: AdminColors.text, lineHeight: 18 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  act: { fontSize: 11, fontWeight: '700' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  billBtn: {
    alignSelf: 'flex-start',
    backgroundColor: AdminColors.purple,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  billBtnText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
