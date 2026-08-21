import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, MapPin, Check, Navigation, Star } from 'lucide-react-native';
import { supabase, Booking } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { JobMeta, isJobAccepted, jobAreaLabel, jobBillTotals, parseJobMeta, writeJobMeta } from '@/lib/jobMeta';
import {
  ensureLocationPermission,
  getCurrentPosition,
  readTechSession,
  watchPosition,
} from '@/lib/techSession';
import { markJobRejected } from '@/lib/useTechBookings';

const STAGES: { key: NonNullable<JobMeta['tech_stage']>; label: string }[] = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'on_way', label: 'On the way' },
  { key: 'doorstep', label: 'Doorstep' },
  { key: 'started', label: 'Started' },
  { key: 'completed', label: 'Completed' },
];

const STAGE_ORDER: NonNullable<JobMeta['tech_stage']>[] = STAGES.map((s) => s.key);

function stageIndex(s?: JobMeta['tech_stage']) {
  const i = STAGE_ORDER.indexOf(s || 'accepted');
  return i < 0 ? 0 : i;
}

export default function TechnicianJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [part1, setPart1] = useState('');
  const [amt1, setAmt1] = useState('');
  const [part2, setPart2] = useState('');
  const [amt2, setAmt2] = useState('');
  const [tick, setTick] = useState(false);
  const [svcRating, setSvcRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const locationWatchRef = useRef<{ remove: () => void } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    setBooking(data);
    if (data) {
      const { meta } = parseJobMeta(data.notes);
      const parts = meta.spare_parts || [];
      setPart1(parts[0]?.name || meta.parts_name || '');
      setAmt1(String(parts[0]?.amount ?? meta.parts_amount ?? ''));
      setPart2(parts[1]?.name || '');
      setAmt2(parts[1] ? String(parts[1].amount) : '');
      setTick(!!meta.complete_tick);
      const { data: svc } = await supabase.from('services').select('rating').eq('id', data.service_id).maybeSingle();
      setSvcRating(Number(svc?.rating || 0));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const stopShare = async () => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    const techId = readTechSession().id;
    if (techId && id) {
      await supabase.from('technician_locations').update({ is_sharing: false }).eq('technician_id', techId).eq('booking_id', id);
    }
  };

  const startShare = async () => {
    await stopShare();
    const techId = readTechSession().id;
    if (!techId || !id) return;
    const ok = await ensureLocationPermission();
    if (!ok) {
      Alert.alert('Location', 'GPS share ke liye permission dena zaroori hai.');
      return;
    }
    const coords = await getCurrentPosition();
    if (coords) {
      await supabase.from('technician_locations').insert({
        technician_id: techId,
        booking_id: id,
        lat: coords.lat,
        lng: coords.lng,
        is_sharing: true,
      });
    }
    const watcher = await watchPosition(async (pos) => {
      await supabase
        .from('technician_locations')
        .update({ lat: pos.lat, lng: pos.lng, updated_at: new Date().toISOString() })
        .eq('technician_id', techId)
        .eq('booking_id', id);
    });
    locationWatchRef.current = watcher;
  };

  useEffect(() => () => { stopShare(); }, []);

  const acceptHere = async () => {
    const techId = readTechSession().id;
    if (!techId || !booking) return;
    setBusy(true);
    const parsed = parseJobMeta(booking.notes);
    const notes = writeJobMeta({ ...parsed.meta, tech_stage: 'accepted' }, parsed.userNotes);
    await supabase.from('bookings').update({ technician_id: techId, status: 'confirmed', notes }).eq('id', booking.id);
    setBusy(false);
    load();
  };

  const rejectHere = async () => {
    if (!booking) return;
    setBusy(true);
    markJobRejected(booking.id);
    if (booking.technician_id) {
      await supabase.from('bookings').update({ technician_id: null }).eq('id', booking.id).eq('status', 'pending');
    }
    setBusy(false);
    router.replace('/technician/(tabs)');
  };

  const persist = async (patch: Partial<JobMeta>, status?: string) => {
    if (!booking) return false;
    setSaving(true);
    const { data: latest } = await supabase.from('bookings').select('notes, status').eq('id', booking.id).maybeSingle();
    const parsed = parseJobMeta(latest?.notes || booking.notes);
    const meta = { ...parsed.meta, ...patch };
    const notes = writeJobMeta(meta, parsed.userNotes);
    const update: Record<string, unknown> = { notes };
    if (status) update.status = status;
    const { error } = await supabase.from('bookings').update(update).eq('id', booking.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Update fail ho gaya.');
      return false;
    }
    setBooking({ ...booking, notes, status: (status as string) || latest?.status || booking.status });
    return true;
  };

  const goStage = async (stage: NonNullable<JobMeta['tech_stage']>) => {
    if (stage === 'completed') return;
    const status = stage === 'accepted' ? 'confirmed' : 'in_progress';
    const ok = await persist({ tech_stage: stage }, status);
    if (!ok) return;
    if (stage === 'on_way' || stage === 'doorstep' || stage === 'started') startShare();
    if (stage === 'accepted') stopShare();
  };

  const pickPhoto = (which: 'before' | 'after') => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Photo', 'Photo upload abhi web pe available hai.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        if (which === 'before') persist({ before_photo_url: url, before_photo_at: new Date().toISOString() });
        else persist({ after_photo_url: url, after_photo_at: new Date().toISOString() });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveBill = async (payment?: 'cod' | 'online') => {
    const spare = [
      { name: part1.trim(), amount: Number(amt1) || 0 },
      { name: part2.trim(), amount: Number(amt2) || 0 },
    ].filter((p) => p.name || p.amount);
    const parts_amount = spare.reduce((s, p) => s + p.amount, 0);
    const parts_name = spare.map((p) => p.name).filter(Boolean).join(', ');
    await persist({
      spare_parts: spare,
      parts_amount,
      parts_name,
      ...(payment ? { payment_status: payment } : {}),
    });
  };

  const completeJob = async () => {
    if (!tick) {
      Alert.alert('Verify', 'Pehle tick karein: job complete / verified.');
      return;
    }
    const spare = [
      { name: part1.trim(), amount: Number(amt1) || 0 },
      { name: part2.trim(), amount: Number(amt2) || 0 },
    ].filter((p) => p.name || p.amount);
    const parts_amount = spare.reduce((s, p) => s + p.amount, 0);
    const parts_name = spare.map((p) => p.name).filter(Boolean).join(', ');
    const ok = await persist(
      { tech_stage: 'completed', complete_tick: true, spare_parts: spare, parts_amount, parts_name },
      'completed'
    );
    if (ok) {
      await stopShare();
      Alert.alert('Done', 'Job complete mark ho gayi.');
      router.replace('/technician/(tabs)');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }
  if (!booking) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Job nahi mili.</Text>
      </SafeAreaView>
    );
  }

  const { meta, userNotes } = parseJobMeta(booking.notes);
  const revealed = isJobAccepted(booking.status);
  const stage = meta.tech_stage || (booking.status === 'completed' ? 'completed' : booking.status === 'in_progress' ? 'started' : 'accepted');
  const idx = stageIndex(stage);
  const bill = jobBillTotals(booking.total_amount, meta);
  const done = booking.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={20} color={Colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Job</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{booking.service_name}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={14} color={Colors.accent[500]} fill={i <= Math.round(svcRating) ? Colors.accent[500] : 'transparent'} />
          ))}
          <Text style={styles.starTxt}>{svcRating ? svcRating.toFixed(1) : 'New'}</Text>
        </View>
        <Text style={styles.cust}>{revealed ? booking.customer_name : booking.customer_name.split(' ')[0]}</Text>
        <Text style={styles.slot}>{booking.scheduled_date} · {booking.scheduled_time}</Text>

        {!revealed && (
          <View style={styles.lock}>
            <Text style={styles.lockTitle}>{jobAreaLabel(booking.notes)}</Text>
            <Text style={styles.lockTxt}>Phone, ghar ka address aur map Accept ke baad khulega.</Text>
            {busy ? (
              <ActivityIndicator color={Colors.primary[600]} />
            ) : (
              <View style={styles.row}>
                <TouchableOpacity style={styles.call} onPress={acceptHere}>
                  <Text style={styles.callTxt}>ACCEPT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loc} onPress={rejectHere}>
                  <Text style={styles.locTxt}>REJECT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {revealed && (
          <>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.call}
            onPress={() => Linking.openURL(`tel:${booking.phone}`)}
          >
            <Phone size={16} color="#fff" />
            <Text style={styles.callTxt}>Call customer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loc}
            onPress={() => {
              const q = encodeURIComponent(booking.address);
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
            }}
          >
            <MapPin size={16} color={Colors.primary[700]} />
            <Text style={styles.locTxt}>Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addr}>
          <Navigation size={14} color={Colors.neutral[400]} />
          <Text style={styles.addrTxt}>{booking.address}</Text>
        </View>
        <Text style={styles.slot}>{booking.scheduled_date} · {booking.scheduled_time}</Text>

        <Text style={styles.h2}>Timeline</Text>
        <View style={styles.timeline}>
          {STAGES.map((s, i) => {
            const on = i <= idx;
            return (
              <View key={s.key} style={styles.tlItem}>
                <View style={[styles.dot, on && styles.dotOn]}>{on ? <Check size={10} color="#fff" /> : null}</View>
                {i < STAGES.length - 1 ? <View style={[styles.line, i < idx && styles.lineOn]} /> : null}
                <Text style={[styles.tlLbl, on && styles.tlOn]}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        {!done && stage !== 'doorstep' && stage !== 'started' && stage !== 'completed' && (
          <TouchableOpacity style={styles.door} onPress={() => goStage('doorstep')} disabled={saving}>
            <Text style={styles.doorTxt}>I HAVE REACHED DOORSTEP</Text>
          </TouchableOpacity>
        )}

        {!done && (idx === 0 || idx === 2) && (
          <View style={styles.stageBtns}>
            {idx === 0 && (
              <TouchableOpacity style={styles.secBtn} onPress={() => goStage('on_way')}>
                <Text style={styles.secTxt}>On the way</Text>
              </TouchableOpacity>
            )}
            {idx === 2 && (
              <TouchableOpacity style={styles.secBtn} onPress={() => goStage('started')}>
                <Text style={styles.secTxt}>Start job</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.h2}>Job details</Text>
        <View style={styles.card}>
          <Text style={styles.p}>{booking.package_name}</Text>
          {userNotes ? <Text style={styles.muted}>{userNotes}</Text> : null}
        </View>

        <Text style={styles.h2}>Photos — before / after</Text>
        <View style={styles.photos}>
          <TouchableOpacity style={styles.photoBox} onPress={() => pickPhoto('before')} disabled={done}>
            {meta.before_photo_url ? (
              <Image source={{ uri: meta.before_photo_url }} style={styles.photo} />
            ) : (
              <Text style={styles.photoHint}>Before</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBox} onPress={() => pickPhoto('after')} disabled={done}>
            {meta.after_photo_url ? (
              <Image source={{ uri: meta.after_photo_url }} style={styles.photo} />
            ) : (
              <Text style={styles.photoHint}>After</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>Billing</Text>
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.muted}>Service charge</Text>
            <Text style={styles.p}>₹{bill.service}</Text>
          </View>
          <Text style={[styles.muted, { marginTop: 10 }]}>Spare parts</Text>
          <TextInput style={styles.input} placeholder="Part 1 name" value={part1} onChangeText={setPart1} editable={!done} />
          <TextInput style={styles.input} placeholder="Part 1 amount" keyboardType="numeric" value={amt1} onChangeText={setAmt1} editable={!done} />
          <TextInput style={styles.input} placeholder="Part 2 name" value={part2} onChangeText={setPart2} editable={!done} />
          <TextInput style={styles.input} placeholder="Part 2 amount" keyboardType="numeric" value={amt2} onChangeText={setAmt2} editable={!done} />
          <Text style={styles.payLbl}>Payment</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pay, meta.payment_status === 'cod' && styles.payOn]}
              onPress={() => saveBill('cod')}
              disabled={done}
            >
              <Text style={[styles.payTxt, meta.payment_status === 'cod' && styles.payTxtOn]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pay, meta.payment_status === 'online' && styles.payOn]}
              onPress={() => saveBill('online')}
              disabled={done}
            >
              <Text style={[styles.payTxt, meta.payment_status === 'online' && styles.payTxtOn]}>Online</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.billRow, { marginTop: 12 }]}>
            <Text style={styles.h1}>Total</Text>
            <Text style={styles.h1}>₹{bill.service + (Number(amt1) || 0) + (Number(amt2) || 0) - bill.discount}</Text>
          </View>
          {!done && (
            <TouchableOpacity style={styles.ghost} onPress={() => saveBill()}>
              <Text style={styles.ghostTxt}>Save bill</Text>
            </TouchableOpacity>
          )}
        </View>

        {!done && (
          <>
            <TouchableOpacity style={styles.tickRow} onPress={() => setTick(!tick)}>
              <View style={[styles.box, tick && styles.boxOn]}>{tick ? <Check size={14} color="#fff" /> : null}</View>
              <Text style={styles.tickTxt}>Job verified / complete (OTP nahi — tick karke submit)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.complete, !tick && { opacity: 0.5 }]} onPress={completeJob} disabled={saving}>
              <Text style={styles.completeTxt}>Complete job</Text>
            </TouchableOpacity>
          </>
        )}
        {done && <Text style={styles.done}>This job is completed.</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral[0], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.neutral[200] },
  navTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { padding: Spacing.lg, paddingBottom: 48 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.neutral[900] },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  starTxt: { marginLeft: 6, fontWeight: '700', color: Colors.neutral[700] },
  lock: { marginTop: 16, backgroundColor: Colors.accent[50], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.accent[200] },
  lockTitle: { fontWeight: '800', color: Colors.neutral[900], fontSize: 15 },
  lockTxt: { marginTop: 6, color: Colors.neutral[600], fontSize: 13, marginBottom: 8 },
  h2: { fontSize: 13, fontWeight: '800', color: Colors.neutral[600], marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  cust: { fontSize: 15, color: Colors.neutral[600], marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  call: { flex: 1, backgroundColor: Colors.primary[600], borderRadius: Radius.md, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  callTxt: { color: '#fff', fontWeight: '800' },
  loc: { flex: 1, backgroundColor: Colors.primary[50], borderRadius: Radius.md, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  locTxt: { color: Colors.primary[700], fontWeight: '800' },
  addr: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'flex-start' },
  addrTxt: { flex: 1, color: Colors.neutral[600], fontSize: 13 },
  slot: { color: Colors.neutral[400], fontSize: 12, marginTop: 4 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tlItem: { flex: 1, alignItems: 'center' },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.neutral[300], alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotOn: { backgroundColor: Colors.success[600] },
  line: { position: 'absolute', top: 8, left: '50%', right: '-50%', height: 2, backgroundColor: Colors.neutral[200] },
  lineOn: { backgroundColor: Colors.success[500] },
  tlLbl: { fontSize: 9, color: Colors.neutral[400], marginTop: 6, textAlign: 'center' },
  tlOn: { color: Colors.success[700], fontWeight: '700' },
  door: { marginTop: 16, backgroundColor: Colors.accent[500], borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  doorTxt: { fontWeight: '800', color: Colors.neutral[900] },
  stageBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  secBtn: { flex: 1, borderWidth: 1, borderColor: Colors.primary[300], borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  secTxt: { color: Colors.primary[700], fontWeight: '700' },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  p: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  muted: { fontSize: 13, color: Colors.neutral[500] },
  photos: { flexDirection: 'row', gap: 10 },
  photoBox: { flex: 1, height: 110, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoHint: { color: Colors.neutral[400], fontWeight: '700' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.sm, padding: 10, marginTop: 8, backgroundColor: Colors.neutral[0] },
  payLbl: { marginTop: 12, fontWeight: '700', color: Colors.neutral[700] },
  pay: { flex: 1, borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  payOn: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  payTxt: { fontWeight: '700', color: Colors.neutral[600] },
  payTxtOn: { color: '#fff' },
  ghost: { marginTop: 10, alignItems: 'center' },
  ghostTxt: { color: Colors.primary[700], fontWeight: '700' },
  tickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.neutral[300], alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.success[600], borderColor: Colors.success[600] },
  tickTxt: { flex: 1, fontSize: 13, color: Colors.neutral[700], fontWeight: '600' },
  complete: { marginTop: 12, backgroundColor: Colors.success[600], borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  completeTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  done: { marginTop: 16, color: Colors.success[700], fontWeight: '700', textAlign: 'center' },
});
