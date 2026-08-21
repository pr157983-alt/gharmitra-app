import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Phone, MapPin, IndianRupee, Clock, Star } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { readTechSession, setTechOnline } from '@/lib/techSession';
import { markJobRejected, useTechBookings } from '@/lib/useTechBookings';
import { supabase } from '@/lib/supabase';
import { jobAreaLabel, parseJobMeta, writeJobMeta } from '@/lib/jobMeta';

function Stars({ value }: { value: number }) {
  const n = Math.round(value || 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} color={Colors.accent[500]} fill={i <= n ? Colors.accent[500] : 'transparent'} />
      ))}
      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.neutral[700], marginLeft: 4 }}>
        {value ? value.toFixed(1) : 'New'}
      </Text>
    </View>
  );
}

export default function TechnicianHomeScreen() {
  const s = readTechSession();
  const [online, setOnline] = useState(s.online);
  const [techName, setTechName] = useState(s.name || 'Technician');
  const [photo, setPhoto] = useState(s.photo || '');
  const [busy, setBusy] = useState<string | null>(null);
  const data = useTechBookings();

  useEffect(() => {
    const sess = readTechSession();
    if (!sess.loggedIn || !sess.id) {
      router.replace('/technician/login');
      return;
    }
    setTechName(sess.name || 'Technician');
    setOnline(sess.online);
    setPhoto(sess.photo || '');
  }, []);

  const toggleOnline = (v: boolean) => {
    setOnline(v);
    setTechOnline(v);
  };

  const acceptJob = async (id: string) => {
    const { id: techId } = readTechSession();
    if (!techId) return;
    setBusy(id);
    const { data: row } = await supabase.from('bookings').select('notes').eq('id', id).maybeSingle();
    const parsed = parseJobMeta(row?.notes);
    const notes = writeJobMeta({ ...parsed.meta, tech_stage: 'accepted' }, parsed.userNotes);
    await supabase.from('bookings').update({ technician_id: techId, status: 'confirmed', notes }).eq('id', id);
    setBusy(null);
    data.reload();
    router.push(`/technician/job/${id}`);
  };

  const rejectJob = async (booking: { id: string; technician_id?: string | null }) => {
    setBusy(booking.id);
    markJobRejected(booking.id);
    if (booking.technician_id) {
      await supabase.from('bookings').update({ technician_id: null }).eq('id', booking.id).eq('status', 'pending');
    }
    setBusy(null);
    data.reload();
  };

  if (data.loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.onRefresh} />}
      >
        <View style={styles.top}>
          <View style={styles.helloRow}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.topPhoto} />
            ) : (
              <View style={styles.topPhotoFallback}>
                <Text style={styles.topPhotoTxt}>{(techName || 'T').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Namaste, {techName.split(' ')[0]}</Text>
              <Text style={styles.sub}>{online ? 'Aap online hain — naye jobs milenge' : 'Offline — jobs pause'}</Text>
              {data.techRatingCount > 0 ? (
                <View style={{ marginTop: 4 }}>
                  <Stars value={data.techRating} />
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.onlineRow}>
            <Text style={[styles.onlineLbl, { color: online ? Colors.success[600] : Colors.neutral[400] }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
            <Switch value={online} onValueChange={toggleOnline} />
          </View>
        </View>

        <View style={styles.kpis}>
          <View style={styles.kpi}>
            <Text style={styles.kpiVal}>₹{data.todayEarning}</Text>
            <Text style={styles.kpiLbl}>Aaj earning</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiVal}>{data.jobsDoneToday}</Text>
            <Text style={styles.kpiLbl}>Jobs complete</Text>
          </View>
        </View>

        {online && data.newJobs.length > 0 && (
          <>
            <Text style={styles.section}>New job alert</Text>
            {data.newJobs.map((j) => {
              const svc = data.serviceRatings[j.service_id];
              return (
                <View key={j.id} style={styles.alert}>
                  <View style={styles.alertHead}>
                    <Text style={styles.alertTag}>NEW JOB</Text>
                    <View style={styles.timer}>
                      <Clock size={12} color={Colors.error[500]} />
                      <Text style={styles.timerTxt}>Accept soon</Text>
                    </View>
                  </View>
                  <Text style={styles.jobTitle}>{j.service_name}</Text>
                  <View style={{ marginTop: 6 }}>
                    <Stars value={svc?.rating || 0} />
                  </View>
                  {svc?.reviews ? (
                    <Text style={styles.muted}>{svc.reviews} reviews</Text>
                  ) : (
                    <Text style={styles.muted}>Nayi service · rating limited</Text>
                  )}
                  <Text style={styles.muted}>{(j.customer_name || 'Customer').split(' ')[0]} · {j.scheduled_date} {j.scheduled_time}</Text>
                  <Text style={styles.muted}>{jobAreaLabel(j.notes)}</Text>
                  <Text style={styles.hint}>Full address Accept ke baad dikhega</Text>
                  <Text style={styles.amt}>₹{j.total_amount}</Text>
                  {busy === j.id ? (
                    <ActivityIndicator color={Colors.primary[600]} />
                  ) : (
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.accept} onPress={() => acceptJob(j.id)}>
                        <Text style={styles.acceptTxt}>ACCEPT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.reject} onPress={() => rejectJob(j)}>
                        <Text style={styles.rejectTxt}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {data.current && (
          <>
            <Text style={styles.section}>Current job</Text>
            <TouchableOpacity style={styles.current} onPress={() => router.push(`/technician/job/${data.current!.id}`)} activeOpacity={0.85}>
              <Text style={styles.jobTitle}>{data.current.service_name}</Text>
              <Text style={styles.muted}>{data.current.customer_name}</Text>
              <Text style={styles.muted} numberOfLines={2}>{data.current.address}</Text>
              <View style={styles.chip}>
                <Text style={styles.chipTxt}>{(data.currentStage || 'accepted').replace('_', ' ')}</Text>
              </View>
              <View style={styles.row}>
                <View style={styles.mini}>
                  <Phone size={14} color={Colors.primary[700]} />
                  <Text style={styles.miniTxt}>Call</Text>
                </View>
                <View style={styles.mini}>
                  <MapPin size={14} color={Colors.primary[700]} />
                  <Text style={styles.miniTxt}>Location</Text>
                </View>
                <View style={styles.mini}>
                  <IndianRupee size={14} color={Colors.primary[700]} />
                  <Text style={styles.miniTxt}>{data.current.total_amount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}

        {!data.current && data.newJobs.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>{online ? 'Abhi koi naya job nahi' : 'Online karke jobs receive karein'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg, gap: 8 },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  topPhoto: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.neutral[200] },
  topPhotoFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  topPhotoTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
  hello: { fontSize: 20, fontWeight: '800', color: Colors.neutral[900] },
  sub: { fontSize: 12, color: Colors.neutral[500], marginTop: 4 },
  onlineRow: { alignItems: 'flex-end' },
  onlineLbl: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  kpis: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  kpi: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  kpiVal: { fontSize: 22, fontWeight: '800', color: Colors.primary[700] },
  kpiLbl: { fontSize: 12, color: Colors.neutral[500], marginTop: 4 },
  section: { fontSize: 13, fontWeight: '800', color: Colors.neutral[600], marginBottom: 10, textTransform: 'uppercase' },
  alert: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent[200],
  },
  alertHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  alertTag: { fontSize: 11, fontWeight: '800', color: Colors.accent[700] },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerTxt: { fontSize: 11, fontWeight: '700', color: Colors.error[500] },
  jobTitle: { fontSize: 16, fontWeight: '800', color: Colors.neutral[900] },
  muted: { fontSize: 13, color: Colors.neutral[500], marginTop: 2 },
  hint: { fontSize: 11, color: Colors.accent[700], marginTop: 6, fontWeight: '600' },
  amt: { fontSize: 18, fontWeight: '800', color: Colors.primary[700], marginVertical: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  accept: { flex: 1, backgroundColor: Colors.success[600], borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  acceptTxt: { color: '#fff', fontWeight: '800' },
  reject: { flex: 1, backgroundColor: Colors.error[50], borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  rejectTxt: { color: Colors.error[600], fontWeight: '800' },
  current: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  chip: { alignSelf: 'flex-start', backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginTop: 8 },
  chipTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary[700], textTransform: 'capitalize' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.neutral[50], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  miniTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary[700] },
  empty: { padding: 40, alignItems: 'center' },
  emptyTxt: { color: Colors.neutral[400] },
});
