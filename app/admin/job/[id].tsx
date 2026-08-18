import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Booking, Technician, Service } from '@/lib/supabase';
import { AdminColors, formatINR, shortId, statusColor } from '@/lib/admin';
import { JobMeta, addDays, jobBillTotals, parseJobMeta, paymentLabel, writeJobMeta } from '@/lib/jobMeta';
import { parseService } from '@/lib/catalogMeta';

const PAYMENTS = [
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'cod', label: 'COD' },
  { id: 'online', label: 'Paid UPI' },
] as const;

export default function AdminJobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<JobMeta>({});
  const [userNotes, setUserNotes] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [techId, setTechId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [catalogVisit, setCatalogVisit] = useState(0);
  const [catalogAddons, setCatalogAddons] = useState<{ id: string; name: string; price: number }[]>([]);

  const load = useCallback(async () => {
    const [b, t] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', id).maybeSingle(),
      supabase.from('technicians').select('*').eq('is_active', true).order('name'),
    ]);
    const row = b.data as Booking | null;
    setBooking(row);
    setTechnicians((t.data as Technician[]) || []);
    if (row) {
      const parsed = parseJobMeta(row.notes);
      setMeta(parsed.meta);
      setUserNotes(parsed.userNotes);
      setDate(row.scheduled_date);
      setTime(row.scheduled_time);
      setCancelReason(parsed.meta.cancel_reason || '');
      setRescheduleReason(parsed.meta.reschedule_reason || '');
      setTechId(row.technician_id);
      setExtraIds(parsed.meta.extra_technician_ids || []);
      if (row.service_id) {
        const s = await supabase.from('services').select('*').eq('id', row.service_id).maybeSingle();
        if (s.data) {
          const sm = parseService(s.data as Service).meta;
          setCatalogVisit(Number(sm.visiting_fee || 0));
          setCatalogAddons(sm.addons || []);
          if (parsed.meta.visiting_fee == null && sm.visiting_fee) {
            setMeta({ ...parsed.meta, visiting_fee: sm.visiting_fee });
          }
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const primaryTech = technicians.find((t) => t.id === techId);
  const extraTechs = technicians.filter((t) => extraIds.includes(t.id));
  const completed = booking?.status === 'completed';
  const st = statusColor(booking?.status || 'pending');

  const bill = useMemo(
    () => jobBillTotals(Number(booking?.total_amount || 0), meta),
    [meta, booking]
  );

  const patchMeta = (p: Partial<JobMeta>) => setMeta((m) => ({ ...m, ...p }));

  const save = async (extra: Partial<Booking> = {}, extraMeta: Partial<JobMeta> = {}) => {
    if (!booking) return;
    setSaving(true);
    const nextMeta: JobMeta = { ...meta, ...extraMeta, extra_technician_ids: extraIds, cancel_reason: cancelReason, reschedule_reason: rescheduleReason };
    const { error } = await supabase
      .from('bookings')
      .update({
        notes: writeJobMeta(nextMeta, userNotes),
        scheduled_date: date,
        scheduled_time: time,
        technician_id: techId,
        total_amount: jobBillTotals(Number(booking.total_amount || 0), nextMeta).total,
        ...extra,
      })
      .eq('id', booking.id);
    setSaving(false);
    if (error) {
      Alert.alert('Save nahi hua', error.message);
      return;
    }
    setMeta(nextMeta);
    load();
  };

  const setStatus = async (status: string) => {
    if (status === 'cancelled' && !cancelReason.trim()) {
      Alert.alert('Cancel reason', 'Cancel se pehle reason likhein.');
      return;
    }
    const extraMeta: Partial<JobMeta> = {};
    if (status === 'completed') {
      extraMeta.warranty_until = addDays(new Date().toISOString().slice(0, 10), 30);
      extraMeta.service_charge = meta.service_charge ?? Number(booking?.total_amount || 0);
    }
    await save({ status }, extraMeta);
  };

  const createFreeVisit = async () => {
    if (!booking) return;
    const until = meta.warranty_until;
    if (until && until < new Date().toISOString().slice(0, 10)) {
      Alert.alert('Warranty khatam', '30 din nikal gaye. Free visit nahi banegi.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('bookings').insert({
      service_id: booking.service_id,
      package_id: booking.package_id,
      service_name: `${booking.service_name} (Free warranty visit)`,
      package_name: booking.package_name,
      customer_name: booking.customer_name,
      phone: booking.phone,
      address: booking.address,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: booking.scheduled_time,
      status: 'pending',
      total_amount: 0,
      technician_id: booking.technician_id,
      customer_id: booking.customer_id,
      notes: writeJobMeta({ is_free_visit: true, payment_status: 'online', service_charge: 0 }, `Free visit from ${booking.id}`),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    patchMeta({ is_free_visit: true });
    await save({}, { is_free_visit: true });
    Alert.alert('Free visit', 'Nayi free booking create ho gayi. Bookings list mein dekho.');
  };

  const pickPhoto = (which: 'before' | 'after') => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        if (which === 'before') patchMeta({ before_photo_url: url, before_photo_at: new Date().toISOString() });
        else patchMeta({ after_photo_url: url, after_photo_at: new Date().toISOString() });
      };
      reader.readAsDataURL(file);
    };
    input.click();
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
        <Text>Job nahi mili.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Bookings</Text>
      </TouchableOpacity>

      <View style={styles.infoRow}>
        <Info label="Job ID" value={shortId(booking.id)} />
        <Info label="Service" value={booking.service_name} />
        <Info label="Mistri" value={primaryTech?.name || 'Unassigned'} />
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={[styles.pill, { backgroundColor: st.bg }]}>
            <Text style={[styles.pillText, { color: st.fg }]}>{booking.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.h2}>Customer</Text>
          <Text style={styles.p}>{booking.customer_name}</Text>
          <Text style={styles.muted}>{booking.phone}</Text>
          <Text style={styles.muted}>{booking.address}</Text>
          <Text style={styles.muted}>
            Slot: {date} · {time}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>Mistri / Staff</Text>
          <Text style={styles.p}>{primaryTech ? `${primaryTech.name} · ${primaryTech.phone}` : 'Assign karein'}</Text>
          {extraTechs.map((t) => (
            <Text key={t.id} style={styles.muted}>
              + {t.name}
            </Text>
          ))}
          <Text style={[styles.h3, { marginTop: 10 }]}>Primary</Text>
          <View style={styles.wrapRow}>
            {technicians.map((t) => (
              <TouchableOpacity key={t.id} style={[styles.chip, techId === t.id && styles.chipOn]} onPress={() => setTechId(t.id)}>
                <Text style={[styles.chipText, techId === t.id && styles.chipTextOn]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.h3}>Extra mistri (bade job)</Text>
          <View style={styles.wrapRow}>
            {technicians
              .filter((t) => t.id !== techId)
              .map((t) => {
                const on = extraIds.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setExtraIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Order tracking</Text>
        <View style={styles.wrapRow}>
          {['pending', 'in_progress', 'completed', 'cancelled'].map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, booking.status === s && styles.chipOn]} onPress={() => setStatus(s)}>
              <Text style={[styles.chipText, booking.status === s && styles.chipTextOn]}>{s.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Cancel reason (required if cancel)" value={cancelReason} onChangeText={setCancelReason} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Reschedule</Text>
        <View style={styles.row2}>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="Time slot" />
        </View>
        <TextInput style={styles.input} placeholder="Reschedule reason" value={rescheduleReason} onChangeText={setRescheduleReason} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Payment</Text>
        <View style={styles.wrapRow}>
          {PAYMENTS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, meta.payment_status === p.id && styles.chipOn]}
              onPress={() => patchMeta({ payment_status: p.id })}
            >
              <Text style={[styles.chipText, meta.payment_status === p.id && styles.chipTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.muted}>Current: {paymentLabel(meta.payment_status)}</Text>
      </View>

      {completed && (
        <>
          <Text style={styles.sectionTitle}>Completed job — proof & bill (customer ko yahi dikhega)</Text>
          <View style={styles.proofRow}>
            <View style={styles.proofCard}>
              <Text style={styles.h2}>Before Repair (Kharab parts)</Text>
              {meta.before_photo_url ? <Image source={{ uri: meta.before_photo_url }} style={styles.photo} /> : <View style={styles.photoEmpty}><Text style={styles.muted}>Kharab parts photo</Text></View>}
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickPhoto('before')}>
                <Text style={styles.uploadText}>Upload before photo</Text>
              </TouchableOpacity>
              <Text style={styles.muted}>Upload time: {meta.before_photo_at ? new Date(meta.before_photo_at).toLocaleString('en-IN') : '—'}</Text>
            </View>
            <View style={styles.proofCard}>
              <Text style={styles.h2}>After Repair</Text>
              {meta.after_photo_url ? <Image source={{ uri: meta.after_photo_url }} style={styles.photo} /> : <View style={styles.photoEmpty}><Text style={styles.muted}>Naya part installed photo</Text></View>}
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickPhoto('after')}>
                <Text style={styles.uploadText}>Upload after photo</Text>
              </TouchableOpacity>
              <Text style={styles.muted}>Upload time: {meta.after_photo_at ? new Date(meta.after_photo_at).toLocaleString('en-IN') : '—'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Inspection / visiting</Text>
            <Text style={styles.muted}>
              Repair mana kiya / sirf check-up → visiting fee auto. Catalog fee: {formatINR(catalogVisit || meta.visiting_fee || 0)}
            </Text>
            <TouchableOpacity
              style={[styles.chip, meta.inspection_only && styles.chipOn, { marginTop: 8, alignSelf: 'flex-start' }]}
              onPress={() =>
                patchMeta({
                  inspection_only: !meta.inspection_only,
                  visiting_fee: Number(meta.visiting_fee || catalogVisit || 0),
                })
              }
            >
              <Text style={[styles.chipText, meta.inspection_only && styles.chipTextOn]}>
                {meta.inspection_only ? 'Inspection only ON' : 'Sirf check-up / repair mana'}
              </Text>
            </TouchableOpacity>
            {meta.inspection_only && (
              <Text style={styles.p}>Bill = visiting fee {formatINR(bill.service)} (add-ons/parts skip)</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Add-ons</Text>
            {(meta.addons || []).map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => patchMeta({ addons: (meta.addons || []).filter((x) => x.id !== a.id) })}
              >
                <Text style={styles.p}>
                  {a.name} · {formatINR(a.price)} · tap to remove
                </Text>
              </TouchableOpacity>
            ))}
            {catalogAddons
              .filter((a) => !(meta.addons || []).some((x) => x.id === a.id))
              .map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.chip, { marginTop: 6, alignSelf: 'flex-start' }]}
                  onPress={() => patchMeta({ addons: [...(meta.addons || []), a] })}
                >
                  <Text style={styles.chipText}>
                    + {a.name} ₹{a.price}
                  </Text>
                </TouchableOpacity>
              ))}
            {(meta.addons || []).length === 0 && catalogAddons.length === 0 && (
              <Text style={styles.muted}>Is service pe add-on nahi.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Parts and Bill</Text>
            <TextInput style={styles.input} placeholder="Service charge" keyboardType="numeric" value={String(meta.service_charge ?? booking.total_amount)} onChangeText={(v) => patchMeta({ service_charge: Number(v) || 0 })} />
            <TextInput style={styles.input} placeholder="Replaced part name (Capacitor)" value={meta.parts_name || ''} onChangeText={(v) => patchMeta({ parts_name: v })} />
            <TextInput style={styles.input} placeholder="Replaced part amount" keyboardType="numeric" value={String(meta.parts_amount ?? '')} onChangeText={(v) => patchMeta({ parts_amount: Number(v) || 0 })} />
            <View style={styles.billBox}>
              {bill.inspection && <Text style={styles.p}>Inspection visiting fee: {formatINR(bill.service)}</Text>}
              {!bill.inspection && <Text style={styles.p}>Service charge: {formatINR(bill.service)}</Text>}
              {bill.addonLines.map((a) => (
                <Text key={a.id} style={styles.p}>
                  Add-on {a.name}: {formatINR(a.price)}
                </Text>
              ))}
              <Text style={styles.p}>
                Replaced Part: {formatINR(bill.parts)} {meta.parts_name ? `(${meta.parts_name})` : ''}
              </Text>
              <Text style={styles.total}>Total: {formatINR(bill.total)} · {paymentLabel(meta.payment_status)}</Text>
            </View>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push(`/admin/bill/${booking.id}`)}>
              <Text style={styles.linkBtnText}>Open customer bill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>30-day warranty</Text>
            <Text style={styles.p}>Valid till: {meta.warranty_until || 'Complete karte hi 30 din set hoga'}</Text>
            <TouchableOpacity style={styles.save} onPress={createFreeVisit} disabled={saving}>
              <Text style={styles.saveText}>Same problem → Create free visit</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.save} onPress={() => save()} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save job details'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 18, gap: 12, paddingBottom: 40 },
  back: { color: AdminColors.purple, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: AdminColors.border, padding: 10 },
  infoLabel: { fontSize: 11, color: AdminColors.muted, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '800', color: AdminColors.text, marginTop: 4 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: AdminColors.border, padding: 14, gap: 8 },
  h2: { fontSize: 14, fontWeight: '800', color: AdminColors.text },
  h3: { fontSize: 12, fontWeight: '700', color: AdminColors.muted, marginTop: 6 },
  p: { fontSize: 13, color: AdminColors.text },
  muted: { fontSize: 12, color: AdminColors.muted },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: AdminColors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipOn: { backgroundColor: AdminColors.purple, borderColor: AdminColors.purple },
  chipText: { fontSize: 11, fontWeight: '700', color: AdminColors.text, textTransform: 'capitalize' },
  chipTextOn: { color: '#fff' },
  input: { borderWidth: 1, borderColor: AdminColors.border, borderRadius: 8, padding: 10, backgroundColor: AdminColors.bg },
  row2: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: AdminColors.purple, marginTop: 6 },
  proofRow: { flexDirection: 'row', gap: 10 },
  proofCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: AdminColors.border, padding: 14, gap: 8 },
  photo: { width: '100%', height: 160, borderRadius: 8, backgroundColor: AdminColors.bg },
  photoEmpty: { height: 120, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: AdminColors.border, alignItems: 'center', justifyContent: 'center' },
  billBox: { backgroundColor: AdminColors.purpleSoft, borderRadius: 10, padding: 12, gap: 4 },
  total: { fontSize: 16, fontWeight: '800', color: AdminColors.purple, marginTop: 4 },
  linkBtn: { alignSelf: 'flex-start' },
  linkBtnText: { color: AdminColors.purple, fontWeight: '800' },
  uploadBtn: { alignSelf: 'flex-start', backgroundColor: AdminColors.blueSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  uploadText: { color: AdminColors.blue, fontWeight: '800', fontSize: 12 },
  save: { backgroundColor: AdminColors.purple, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
});
