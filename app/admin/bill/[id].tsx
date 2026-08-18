import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { supabase, Booking, Technician } from '@/lib/supabase';
import { AdminColors, formatINR, shortId } from '@/lib/admin';
import { parseJobMeta, paymentLabel, jobBillTotals } from '@/lib/jobMeta';

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tech, setTech] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
      setBooking((data as Booking) || null);
      if (data?.technician_id) {
        const t = await supabase.from('technicians').select('*').eq('id', data.technician_id).maybeSingle();
        setTech((t.data as Technician) || null);
      }
      setLoading(false);
    })();
  }, [id]);

  const printBill = () => {
    if (Platform.OS === 'web') window.print();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text>Bill nahi mili.</Text>
      </View>
    );
  }

  const meta = parseJobMeta(booking.notes).meta;
  const totals = jobBillTotals(Number(booking.total_amount || 0), meta);
  const dateLabel = new Date(booking.scheduled_date || booking.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines = [
    {
      sn: 1,
      desc: totals.inspection ? `${booking.service_name} (Inspection / visiting)` : booking.service_name,
      qty: '1 Service',
      rate: totals.service,
      amount: totals.service,
    },
    ...totals.addonLines.map((a, i) => ({
      sn: 2 + i,
      desc: `Add-on: ${a.name}`,
      qty: '1 Extra',
      rate: Number(a.price),
      amount: Number(a.price),
    })),
    ...(totals.location > 0
      ? [
          {
            sn: 2 + totals.addonLines.length,
            desc: `Location extra${meta.location_label ? ` (${meta.location_label})` : ''}`,
            qty: '1',
            rate: totals.location,
            amount: totals.location,
          },
        ]
      : []),
    ...(totals.surge > 0
      ? [
          {
            sn: 3 + totals.addonLines.length,
            desc: `Peak / surge${meta.surge_label ? ` (${meta.surge_label})` : ''}`,
            qty: '1',
            rate: totals.surge,
            amount: totals.surge,
          },
        ]
      : []),
    ...(totals.parts > 0
      ? [
          {
            sn: 4 + totals.addonLines.length,
            desc: `Replaced Part${meta.parts_name ? ` (${meta.parts_name})` : ''}`,
            qty: '1 Pcs',
            rate: totals.parts,
            amount: totals.parts,
          },
        ]
      : []),
  ];

  const calc = {
    gross: totals.total,
    discount: 0,
    taxable: totals.total,
    cgst: +(totals.total * 0.09).toFixed(2),
    sgst: +(totals.total * 0.09).toFixed(2),
    payable: +(totals.total * 1.18).toFixed(2),
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.toolbar} nativeID="no-print">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printBtn} onPress={printBill}>
          <FileText size={14} color="#fff" />
          <Text style={styles.printText}>Print / Save PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.company}>GHAR MITRA</Text>
        <Text style={styles.tag}>Home Services</Text>
        <View style={styles.infoLine}>
          <Text style={styles.meta}>GSTIN : 10AABCU1234N1Z5</Text>
          <Text style={styles.meta}>Helpline : 1800-123-4567</Text>
        </View>
        <View style={styles.rule} />

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.row}>Invoice No:- {shortId(booking.id).replace('#', 'INV-')}</Text>
            <Text style={styles.row}>Customer:- {booking.customer_name}</Text>
            <Text style={styles.row}>Address:- {booking.address}</Text>
            <Text style={styles.row}>Mobile:- {booking.phone}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.row}>Date - {dateLabel}</Text>
            <Text style={styles.row}>Booking ID:- {shortId(booking.id)}</Text>
            <Text style={styles.row}>Technician:- {tech?.name || '—'}</Text>
          </View>
        </View>

        <View style={styles.tableHead}>
          {['S.N', 'Description', 'Qty / Type', 'Rate', 'Amount'].map((h) => (
            <Text key={h} style={[styles.th, h === 'Description' && { flex: 2.2 }]}>
              {h}
            </Text>
          ))}
        </View>
        {lines.map((l) => (
          <View key={l.sn} style={styles.tableRow}>
            <Text style={styles.td}>{l.sn}</Text>
            <Text style={[styles.td, { flex: 2.2, textAlign: 'left' }]}>{l.desc}</Text>
            <Text style={styles.td}>{l.qty}</Text>
            <Text style={styles.td}>{formatINR(l.rate)}</Text>
            <Text style={styles.td}>{formatINR(l.amount)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Line label="Gross Subtotal" value={formatINR(calc.gross)} />
          <Line label="Less: Coupon Discount" value={calc.discount ? `- ${formatINR(calc.discount)}` : formatINR(0)} />
          <Line label="Taxable Amount (Net Subtotal)" value={formatINR(calc.taxable)} />
          <Line label="Add: CGST @ 9%" value={formatINR(calc.cgst)} />
          <Line label="Add: SGST @ 9%" value={formatINR(calc.sgst)} />
          <View style={styles.payable}>
            <Text style={styles.payableLabel}>Total Amount Payable · {paymentLabel(meta.payment_status)}</Text>
            <Text style={styles.payableValue}>{formatINR(calc.payable)}</Text>
          </View>
        </View>

        <Text style={styles.thanks}>Thank you for using Ghar Mitra Services!</Text>
      </View>
    </ScrollView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.trow}>
      <Text style={styles.tlabel}>{label}</Text>
      <Text style={styles.tvalue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 20, alignItems: 'center' },
  toolbar: { width: '100%', maxWidth: 720, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  back: { color: AdminColors.purple, fontWeight: '700' },
  printBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: AdminColors.purple, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  printText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  sheet: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: AdminColors.purple,
    borderRadius: 8,
    padding: 24,
  },
  company: { textAlign: 'center', fontSize: 26, fontWeight: '900', color: AdminColors.purple, letterSpacing: 1 },
  tag: { textAlign: 'center', color: AdminColors.muted, marginTop: 2, marginBottom: 10 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: AdminColors.text, fontWeight: '600' },
  rule: { height: 2, backgroundColor: AdminColors.purple, marginVertical: 12 },
  metaGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaCol: { flex: 1, gap: 4 },
  row: { fontSize: 13, color: AdminColors.text },
  tableHead: { flexDirection: 'row', backgroundColor: AdminColors.purpleSoft, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 4 },
  th: { flex: 1, fontSize: 11, fontWeight: '800', color: AdminColors.purple, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: AdminColors.border },
  td: { flex: 1, fontSize: 12, color: AdminColors.text, textAlign: 'center' },
  totals: { marginTop: 16, alignSelf: 'flex-end', width: 320 },
  trow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tlabel: { fontSize: 12, color: AdminColors.muted },
  tvalue: { fontSize: 12, fontWeight: '700', color: AdminColors.text },
  payable: {
    marginTop: 8,
    backgroundColor: AdminColors.purple,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payableLabel: { color: '#fff', fontWeight: '800' },
  payableValue: { color: '#fff', fontWeight: '900' },
  thanks: { textAlign: 'center', marginTop: 28, color: AdminColors.purple, fontWeight: '700' },
});
