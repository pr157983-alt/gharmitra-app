import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Tag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AdminColors, getAdminRole } from '@/lib/admin';
import { newAddonId, type PromoOffer } from '@/lib/catalogMeta';
import { loadPromoOffers, savePromoOffers, offerStatus, offerDiscountLabel } from '@/lib/offers';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function splitLocal(iso: string) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function toIso(date: string, time: string) {
  if (!date) return '';
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

const emptyForm = {
  title: '',
  subtitle: '',
  code: '',
  percent: '',
  flat: '',
  min_amount: '',
  startDate: '',
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
};

const STATUS_COLOR: Record<string, string> = {
  live: AdminColors.green,
  scheduled: AdminColors.orange,
  expired: AdminColors.muted,
  off: AdminColors.red,
};

export default function AdminOffersScreen() {
  const [role, setRole] = useState<'super' | 'viewer'>('super');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [catId, setCatId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, cats] = await Promise.all([
      loadPromoOffers(),
      supabase.from('service_categories').select('id').order('sort_order').limit(1),
    ]);
    setOffers(list);
    if (cats.data?.[0]?.id) setCatId(cats.data[0].id);
    setLoading(false);
  }, []);

  useEffect(() => {
    setRole(getAdminRole() || 'super');
    load();
  }, [load]);

  const persist = async (next: PromoOffer[]) => {
    if (!catId) {
      Alert.alert('Error', 'Pehle ek service category banao.');
      return;
    }
    setSaving(true);
    const res = await savePromoOffers(next, catId);
    setSaving(false);
    if (res.error) {
      Alert.alert('Save fail', res.error);
      return;
    }
    setOffers(next);
  };

  const fillEdit = (o: PromoOffer) => {
    const s = splitLocal(o.starts_at);
    const e = splitLocal(o.ends_at);
    setEditId(o.id);
    setForm({
      title: o.title,
      subtitle: o.subtitle,
      code: o.code,
      percent: String(o.percent || ''),
      flat: String(o.flat || ''),
      min_amount: String(o.min_amount || ''),
      startDate: s.date,
      startTime: s.time || '00:00',
      endDate: e.date,
      endTime: e.time || '23:59',
    });
  };

  const saveForm = async () => {
    if (role !== 'super') return;
    if (!form.title.trim()) {
      Alert.alert('Missing', 'Offer title zaroori hai.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      Alert.alert('Timeline', 'Start date aur end date dono chahiye.');
      return;
    }
    const starts_at = toIso(form.startDate, form.startTime);
    const ends_at = toIso(form.endDate, form.endTime);
    if (!starts_at || !ends_at || new Date(ends_at) <= new Date(starts_at)) {
      Alert.alert('Timeline', 'End time start ke baad hona chahiye.');
      return;
    }
    const row: PromoOffer = {
      id: editId || newAddonId(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      code: form.code.trim().toUpperCase(),
      percent: Number(form.percent) || 0,
      flat: Number(form.flat) || 0,
      min_amount: Number(form.min_amount) || 0,
      starts_at,
      ends_at,
      enabled: editId ? offers.find((x) => x.id === editId)?.enabled !== false : true,
    };
    const next = editId ? offers.map((x) => (x.id === editId ? row : x)) : [row, ...offers];
    await persist(next);
    setEditId(null);
    setForm(emptyForm);
  };

  const toggle = async (id: string) => {
    if (role !== 'super') return;
    await persist(offers.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)));
  };

  const remove = async (id: string) => {
    if (role !== 'super') return;
    await persist(offers.filter((o) => o.id !== id));
    if (editId === id) {
      setEditId(null);
      setForm(emptyForm);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Discount offers</Text>
      <Text style={styles.sub}>
        Customer Home pe sirf LIVE offers dikhte hain. Off = hide. Timeline = start–end. Checkout pe code lagta hai.
      </Text>

      {role === 'super' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editId ? 'Edit offer' : 'New offer'}</Text>
          <TextInput style={styles.input} placeholder="Title (AC Summer Sale)" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholderTextColor={AdminColors.muted} />
          <TextInput style={styles.input} placeholder="Subtitle (Home pe dikhega)" value={form.subtitle} onChangeText={(v) => setForm({ ...form, subtitle: v })} placeholderTextColor={AdminColors.muted} />
          <TextInput style={styles.input} placeholder="Checkout code (SAVE50) optional" autoCapitalize="characters" value={form.code} onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholderTextColor={AdminColors.muted} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} placeholder="% off" keyboardType="numeric" value={form.percent} onChangeText={(v) => setForm({ ...form, percent: v })} placeholderTextColor={AdminColors.muted} />
            <TextInput style={[styles.input, styles.flex]} placeholder="₹ flat off" keyboardType="numeric" value={form.flat} onChangeText={(v) => setForm({ ...form, flat: v })} placeholderTextColor={AdminColors.muted} />
            <TextInput style={[styles.input, styles.flex]} placeholder="Min ₹" keyboardType="numeric" value={form.min_amount} onChangeText={(v) => setForm({ ...form, min_amount: v })} placeholderTextColor={AdminColors.muted} />
          </View>
          <Text style={styles.label}>Start</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} placeholder="YYYY-MM-DD" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} placeholderTextColor={AdminColors.muted} />
            <TextInput style={[styles.input, { width: 110 }]} placeholder="HH:MM" value={form.startTime} onChangeText={(v) => setForm({ ...form, startTime: v })} placeholderTextColor={AdminColors.muted} />
          </View>
          <Text style={styles.label}>End</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} placeholder="YYYY-MM-DD" value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} placeholderTextColor={AdminColors.muted} />
            <TextInput style={[styles.input, { width: 110 }]} placeholder="HH:MM" value={form.endTime} onChangeText={(v) => setForm({ ...form, endTime: v })} placeholderTextColor={AdminColors.muted} />
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={saveForm} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Saving…' : editId ? 'Update offer' : 'Create offer'}</Text>
            </TouchableOpacity>
            {editId ? (
              <TouchableOpacity
                style={styles.ghost}
                onPress={() => {
                  setEditId(null);
                  setForm(emptyForm);
                }}
              >
                <Text style={styles.ghostText}>Cancel edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.sub}>Viewer PIN se offer change nahi ho sakte.</Text>
      )}

      {offers.length === 0 ? (
        <Text style={styles.sub}>Abhi koi offer nahi. Upar se create karo — Home pe tab hi dikhega jab ON + timeline ke andar ho.</Text>
      ) : null}

      {offers.map((o) => {
        const st = offerStatus(o);
        return (
          <View key={o.id} style={styles.offerCard}>
            <View style={styles.offerTop}>
              <View style={[styles.iconWrap, { backgroundColor: `${STATUS_COLOR[st]}22` }]}>
                <Tag size={18} color={STATUS_COLOR[st]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerMeta}>
                  {offerDiscountLabel(o)}
                  {o.code ? ` · ${o.code}` : ''}
                  {o.min_amount ? ` · min ₹${o.min_amount}` : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[st]}22` }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[st] }]}>{st.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.time}>
              {o.starts_at ? new Date(o.starts_at).toLocaleString() : '—'} → {o.ends_at ? new Date(o.ends_at).toLocaleString() : '—'}
            </Text>
            {o.subtitle ? <Text style={styles.sub}>{o.subtitle}</Text> : null}
            {role === 'super' ? (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.smallBtn, o.enabled ? styles.offBtn : styles.onBtn]} onPress={() => toggle(o.id)}>
                  <Text style={styles.smallBtnText}>{o.enabled ? 'Turn OFF' : 'Turn ON'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={() => fillEdit(o)}>
                  <Text style={styles.smallBtnDark}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={() => remove(o.id)}>
                  <Text style={styles.danger}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  page: { padding: 22, paddingBottom: 48, gap: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: AdminColors.border, maxWidth: 720 },
  cardTitle: { fontWeight: '800', fontSize: 16, marginBottom: 10, color: AdminColors.text },
  label: { fontSize: 12, fontWeight: '700', color: AdminColors.muted, marginBottom: 4, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
    color: AdminColors.text,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 90 },
  btn: { backgroundColor: AdminColors.purple, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800' },
  ghost: { paddingHorizontal: 12, paddingVertical: 12 },
  ghostText: { color: AdminColors.muted, fontWeight: '700' },
  offerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AdminColors.border, maxWidth: 720 },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  offerTitle: { fontWeight: '800', fontSize: 16, color: AdminColors.text },
  offerMeta: { color: AdminColors.muted, marginTop: 2, fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  time: { fontSize: 12, color: AdminColors.muted, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallBtn: { borderWidth: 1, borderColor: AdminColors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  onBtn: { backgroundColor: AdminColors.greenSoft, borderColor: '#A7F3D0' },
  offBtn: { backgroundColor: AdminColors.redSoft, borderColor: '#FECACA' },
  smallBtnText: { fontWeight: '800', fontSize: 12, color: AdminColors.text },
  smallBtnDark: { fontWeight: '800', fontSize: 12, color: AdminColors.purple },
  danger: { fontWeight: '800', fontSize: 12, color: AdminColors.red },
});
