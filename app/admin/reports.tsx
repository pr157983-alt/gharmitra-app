import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { supabase, Booking, Technician } from '@/lib/supabase';
import { AdminColors, downloadCSV, formatINR } from '@/lib/admin';
import { parseJobMeta, paymentLabel } from '@/lib/jobMeta';
import { SEGMENT_LABEL, loadBlacklist, segmentFor, spendOf } from '@/lib/customerSegment';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function techName(techById: Record<string, Technician>, id?: string | null) {
  if (!id) return '';
  return techById[id]?.name || '';
}

function extraStaffNames(b: Booking, techById: Record<string, Technician>) {
  const ids = parseJobMeta(b.notes).meta.extra_technician_ids || [];
  return ids.map((id) => techName(techById, id)).filter(Boolean).join('; ');
}

function bookingHistoryRow(b: Booking, techById: Record<string, Technician>) {
  const { meta, userNotes } = parseJobMeta(b.notes);
  return {
    id: b.id,
    created_at: (b.created_at || '').slice(0, 19).replace('T', ' '),
    date: b.scheduled_date,
    time: b.scheduled_time || '',
    customer: b.customer_name,
    phone: b.phone,
    address: b.address || '',
    service: b.service_name,
    package: b.package_name || '',
    amount: b.total_amount,
    status: b.status,
    payment: paymentLabel(meta.payment_status),
    technician: techName(techById, b.technician_id),
    extra_staff: extraStaffNames(b, techById),
    cancel_reason: meta.cancel_reason || '',
    warranty: meta.warranty_until || '',
    free_visit: meta.is_free_visit ? 'yes' : 'no',
    notes: userNotes || '',
  };
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as unknown as number, backgroundColor: color }]} />
      </View>
      <Text style={styles.barVal}>{value}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [commission, setCommission] = useState(20);

  const setPeriodRange = (p: Period) => {
    setPeriod(p);
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now);
    if (p === 'daily') start.setDate(now.getDate());
    if (p === 'weekly') start.setDate(now.getDate() - 6);
    if (p === 'monthly') start.setDate(1);
    if (p === 'yearly') {
      start.setMonth(0);
      start.setDate(1);
    }
    setFrom(start.toISOString().slice(0, 10));
    setTo(end);
  };

  const load = useCallback(async () => {
    const [b, t, s] = await Promise.all([
      supabase.from('bookings').select('*').order('scheduled_date', { ascending: false }),
      supabase.from('technicians').select('*'),
      supabase.from('admin_settings').select('commission_rate').limit(1).maybeSingle(),
    ]);
    setBookings((b.data as Booking[]) || []);
    setTechnicians((t.data as Technician[]) || []);
    if (s.data?.commission_rate != null) setCommission(Number(s.data.commission_rate));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ranged = useMemo(
    () => bookings.filter((b) => inRange(b.scheduled_date, from, to)),
    [bookings, from, to]
  );

  const completed = ranged.filter((b) => b.status === 'completed');
  const cancelled = ranged.filter((b) => b.status === 'cancelled');

  const revenueByBucket = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((b) => {
      const d = b.scheduled_date;
      let key = d;
      if (period === 'monthly') key = d.slice(0, 7);
      if (period === 'yearly') key = d.slice(0, 4);
      if (period === 'weekly') {
        const dt = new Date(d);
        const onejan = new Date(dt.getFullYear(), 0, 1);
        const week = Math.ceil(((+dt - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
        key = `${dt.getFullYear()}-W${week}`;
      }
      map[key] = (map[key] || 0) + Number(b.total_amount || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [completed, period]);

  const paymentBreak = useMemo(() => {
    const acc = { online: 0, cod: 0, unpaid: 0, onlineAmt: 0, codAmt: 0, unpaidAmt: 0 };
    completed.forEach((b) => {
      const p = parseJobMeta(b.notes).meta.payment_status || 'unpaid';
      const amt = Number(b.total_amount || 0);
      if (p === 'online') {
        acc.online++;
        acc.onlineAmt += amt;
      } else if (p === 'cod') {
        acc.cod++;
        acc.codAmt += amt;
      } else {
        acc.unpaid++;
        acc.unpaidAmt += amt;
      }
    });
    return acc;
  }, [completed]);

  const totalSale = completed.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const staffCost = totalSale * (commission / 100);
  const netProfit = totalSale - staffCost;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = useMemo(() => {
    const arr = [0, 0, 0, 0, 0, 0, 0];
    ranged.forEach((b) => {
      const i = new Date(b.scheduled_date).getDay();
      arr[i] += 1;
    });
    return arr;
  }, [ranged]);

  const byTime = useMemo(() => {
    const map: Record<string, number> = {};
    ranged.forEach((b) => {
      const t = b.scheduled_time || 'Anytime';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [ranged]);

  const cancelRows = cancelled.map((b) => ({
    id: b.id,
    customer: b.customer_name,
    phone: b.phone,
    service: b.service_name,
    date: b.scheduled_date,
    amount: b.total_amount,
    reason: parseJobMeta(b.notes).meta.cancel_reason || parseJobMeta(b.notes).userNotes || '—',
  }));

  const servicePerf = useMemo(() => {
    const map: Record<string, { name: string; count: number; completed: number; revenue: number }> = {};
    ranged.forEach((b) => {
      const k = b.service_name || 'Unknown';
      map[k] = map[k] || { name: k, count: 0, completed: 0, revenue: 0 };
      map[k].count++;
      if (b.status === 'completed') {
        map[k].completed++;
        map[k].revenue += Number(b.total_amount || 0);
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [ranged]);

  const staffPerf = useMemo(() => {
    return technicians.map((t) => {
      const mine = ranged.filter((b) => b.technician_id === t.id);
      const done = mine.filter((b) => b.status === 'completed').length;
      const canc = mine.filter((b) => b.status === 'cancelled').length;
      const total = mine.length || 1;
      return {
        name: t.name,
        phone: t.phone,
        assigned: mine.length,
        completed: done,
        cancelled: canc,
        cancel_rate: `${Math.round((canc / total) * 100)}%`,
        rating: 'N/A',
      };
    });
  }, [technicians, ranged]);

  const techById = useMemo(() => {
    const map: Record<string, Technician> = {};
    technicians.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [technicians]);

  const clv = useMemo(() => {
    const phones = [...new Set(ranged.map((b) => b.phone).filter(Boolean))];
    const bl = loadBlacklist();
    return phones
      .map((phone) => {
        const list = bookings.filter((b) => b.phone === phone);
        const spend = spendOf(list);
        const dates = list.map((b) => b.scheduled_date).sort();
        return {
          customer: list[0]?.customer_name || phone,
          phone,
          orders: list.length,
          spend,
          first_booking: dates[0] || '',
          last_booking: dates[dates.length - 1] || '',
          segment: SEGMENT_LABEL[segmentFor(list.length, spend, bl.includes(phone))],
        };
      })
      .sort((a, b) => b.spend - a.spend);
  }, [ranged, bookings]);

  const bookingHistory = useMemo(
    () => ranged.map((b) => bookingHistoryRow(b, techById)),
    [ranged, techById]
  );

  const customerBookingHistory = useMemo(() => {
    const phones = new Set(ranged.map((b) => b.phone).filter(Boolean));
    return bookings
      .filter((b) => phones.has(b.phone))
      .slice()
      .sort((a, b) => `${b.scheduled_date}${b.scheduled_time}`.localeCompare(`${a.scheduled_date}${a.scheduled_time}`))
      .map((b) => bookingHistoryRow(b, techById));
  }, [bookings, ranged, techById]);

  const staffJobHistory = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    ranged.forEach((b) => {
      const { meta } = parseJobMeta(b.notes);
      const extraIds = meta.extra_technician_ids || [];
      const ids = [b.technician_id, ...extraIds].filter(Boolean) as string[];
      const unique = [...new Set(ids)];
      unique.forEach((id) => {
        const row = bookingHistoryRow(b, techById);
        rows.push({
          staff: techName(techById, id) || id,
          staff_phone: techById[id]?.phone || '',
          role: id === b.technician_id ? 'primary' : 'extra',
          ...row,
        });
      });
    });
    return rows;
  }, [ranged, techById]);

  const maxRev = Math.max(...revenueByBucket.map(([, v]) => v), 1);
  const maxDay = Math.max(...byDay, 1);
  const maxTime = Math.max(...byTime.map(([, v]) => v), 1);
  const maxSvc = Math.max(...servicePerf.map((s) => s.count), 1);

  if (loading) {
    return (
      <View style={{ padding: 40 }}>
        <ActivityIndicator color={AdminColors.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Reports</Text>
      <Text style={styles.sub}>View + Excel download · date: {from} → {to}</Text>

      <View style={styles.filters}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
          <TouchableOpacity key={p} style={[styles.chip, period === p && styles.chipOn]} onPress={() => setPeriodRange(p)}>
            <Text style={[styles.chipText, period === p && styles.chipTextOn]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.range}>
        <TextInput style={styles.input} value={from} onChangeText={setFrom} />
        <TextInput style={styles.input} value={to} onChangeText={setTo} />
      </View>

      <Text style={styles.section}>Full history</Text>
      <ReportCard
        title={`Booking history (${bookingHistory.length})`}
        onDownload={() => downloadCSV('booking-history.csv', bookingHistory as unknown as Record<string, unknown>[])}
      >
        {bookingHistory.slice(0, 20).map((r) => (
          <Text key={r.id} style={styles.line}>
            {r.date} {r.time} · {r.customer} · {r.service} · {r.status} · {formatINR(Number(r.amount || 0))} · {r.technician || 'Unassigned'}
          </Text>
        ))}
        {bookingHistory.length > 20 && <Text style={styles.hint}>Screen pe pehle 20. Excel mein saari {bookingHistory.length} rows.</Text>}
        {bookingHistory.length === 0 && <Text style={styles.empty}>Is range mein booking nahi.</Text>}
      </ReportCard>
      <ReportCard
        title={`Customer list (${clv.length})`}
        onDownload={() => downloadCSV('customers.csv', clv as unknown as Record<string, unknown>[])}
      >
        {clv.slice(0, 20).map((c) => (
          <Text key={c.phone} style={styles.line}>
            {c.customer} · {c.phone} · {c.orders} orders · {formatINR(c.spend)} · last {c.last_booking} · {c.segment}
          </Text>
        ))}
        {clv.length > 20 && <Text style={styles.hint}>Screen pe pehle 20. Excel mein poori list.</Text>}
        {clv.length === 0 && <Text style={styles.empty}>No customers in range.</Text>}
      </ReportCard>
      <ReportCard
        title={`Customer booking history (${customerBookingHistory.length})`}
        onDownload={() =>
          downloadCSV('customer-booking-history.csv', customerBookingHistory as unknown as Record<string, unknown>[])
        }
      >
        <Text style={styles.hint}>Range ke customers ki lifetime bookings (pehle se last tak).</Text>
        {customerBookingHistory.slice(0, 20).map((r) => (
          <Text key={`${r.phone}-${r.id}`} style={styles.line}>
            {r.customer} · {r.date} · {r.service} · {r.status} · {formatINR(Number(r.amount || 0))}
          </Text>
        ))}
        {customerBookingHistory.length > 20 && (
          <Text style={styles.hint}>Screen pe pehle 20. Excel mein saari rows.</Text>
        )}
        {customerBookingHistory.length === 0 && <Text style={styles.empty}>No customer history.</Text>}
      </ReportCard>
      <ReportCard
        title={`Staff job history (${staffJobHistory.length})`}
        onDownload={() => downloadCSV('staff-job-history.csv', staffJobHistory)}
      >
        {staffJobHistory.slice(0, 20).map((r, i) => (
          <Text key={`${String(r.id)}-${String(r.staff)}-${i}`} style={styles.line}>
            {String(r.staff)} ({String(r.role)}) · {String(r.date)} · {String(r.customer)} · {String(r.service)} · {String(r.status)}
          </Text>
        ))}
        {staffJobHistory.length > 20 && <Text style={styles.hint}>Screen pe pehle 20. Excel mein saari jobs.</Text>}
        {staffJobHistory.length === 0 && <Text style={styles.empty}>Is range mein assigned jobs nahi.</Text>}
      </ReportCard>

      <Text style={styles.section}>Business / Revenue</Text>
      <View style={styles.kpis}>
        <Kpi title="Total Sale" value={formatINR(totalSale)} color={AdminColors.purple} />
        <Kpi title={`Staff commission ${commission}%`} value={formatINR(staffCost)} color={AdminColors.orange} />
        <Kpi title="Net Profit" value={formatINR(netProfit)} color={AdminColors.green} />
      </View>
      <ReportCard
        title="Total Sale / Revenue"
        onDownload={() =>
          downloadCSV(
            'revenue.csv',
            revenueByBucket.map(([bucket, amount]) => ({ bucket, amount }))
          )
        }
      >
        {revenueByBucket.length === 0 ? (
          <Text style={styles.empty}>Is period mein completed sale nahi.</Text>
        ) : (
          revenueByBucket.map(([k, v]) => <Bar key={k} label={k} value={Math.round(v)} max={maxRev} color={AdminColors.purple} />)
        )}
      </ReportCard>
      <ReportCard
        title="Payment mode (Online vs COD)"
        onDownload={() =>
          downloadCSV('payment-mode.csv', [
            { mode: 'Online UPI/Card', jobs: paymentBreak.online, amount: paymentBreak.onlineAmt },
            { mode: 'Cash on Delivery', jobs: paymentBreak.cod, amount: paymentBreak.codAmt },
            { mode: 'Unpaid', jobs: paymentBreak.unpaid, amount: paymentBreak.unpaidAmt },
          ])
        }
      >
        <Text style={styles.line}>Online: {paymentBreak.online} jobs · {formatINR(paymentBreak.onlineAmt)}</Text>
        <Text style={styles.line}>COD: {paymentBreak.cod} jobs · {formatINR(paymentBreak.codAmt)}</Text>
        <Text style={styles.line}>Unpaid: {paymentBreak.unpaid} jobs · {formatINR(paymentBreak.unpaidAmt)}</Text>
      </ReportCard>
      <ReportCard
        title="Profit margin (price − staff commission)"
        onDownload={() =>
          downloadCSV('profit.csv', [{ sale: totalSale, commission_pct: commission, staff_cost: staffCost, net_profit: netProfit }])
        }
      >
        <Text style={styles.line}>Sale {formatINR(totalSale)} − Commission {formatINR(staffCost)} = Profit {formatINR(netProfit)}</Text>
      </ReportCard>

      <Text style={styles.section}>Operational / Booking</Text>
      <ReportCard
        title="Booking trends — peak days"
        onDownload={() => downloadCSV('peak-days.csv', dayNames.map((d, i) => ({ day: d, bookings: byDay[i] })))}
      >
        {dayNames.map((d, i) => (
          <Bar key={d} label={d} value={byDay[i]} max={maxDay} color={AdminColors.blue} />
        ))}
      </ReportCard>
      <ReportCard
        title="Peak hours / time slots"
        onDownload={() => downloadCSV('peak-hours.csv', byTime.map(([time, count]) => ({ time, count })))}
      >
        {byTime.slice(0, 8).map(([t, c]) => (
          <Bar key={t} label={t} value={c} max={maxTime} color={AdminColors.orange} />
        ))}
        {byTime.length === 0 && <Text style={styles.empty}>No bookings in range.</Text>}
      </ReportCard>
      <ReportCard
        title={`Cancellation / refund (${cancelled.length})`}
        onDownload={() => downloadCSV('cancellations.csv', cancelRows as unknown as Record<string, unknown>[])}
      >
        {cancelRows.slice(0, 8).map((r) => (
          <Text key={r.id} style={styles.line}>
            {r.customer} · {r.service} · {r.reason}
          </Text>
        ))}
        {cancelRows.length === 0 && <Text style={styles.empty}>Koi cancel nahi is range mein.</Text>}
      </ReportCard>
      <ReportCard
        title="Top / low performing services"
        onDownload={() => downloadCSV('services-performance.csv', servicePerf as unknown as Record<string, unknown>[])}
      >
        {servicePerf.map((s) => (
          <Bar key={s.name} label={`${s.name} (${s.count})`} value={s.count} max={maxSvc} color={AdminColors.green} />
        ))}
        {servicePerf.length === 0 && <Text style={styles.empty}>No service data.</Text>}
      </ReportCard>

      <Text style={styles.section}>Staff / Customer</Text>
      <ReportCard
        title="Staff performance"
        onDownload={() => downloadCSV('staff-performance.csv', staffPerf as unknown as Record<string, unknown>[])}
      >
        {staffPerf.map((s) => (
          <Text key={s.phone} style={styles.line}>
            {s.name}: {s.completed} done / {s.assigned} jobs · cancel {s.cancel_rate} · rating {s.rating}
          </Text>
        ))}
        {staffPerf.length === 0 && <Text style={styles.empty}>No staff.</Text>}
      </ReportCard>
      <ReportCard
        title="Customer lifetime value (regulars)"
        onDownload={() => downloadCSV('customer-ltv.csv', clv as unknown as Record<string, unknown>[])}
      >
        {clv.slice(0, 12).map((c) => (
          <Text key={`ltv-${c.phone}`} style={styles.line}>
            {c.customer} · {c.orders} orders · {formatINR(c.spend)} · {c.segment}
          </Text>
        ))}
        {clv.length === 0 && <Text style={styles.empty}>No customers in range.</Text>}
      </ReportCard>
    </ScrollView>
  );
}

function Kpi({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={[styles.kpi, { borderColor: color }]}>
      <Text style={styles.kpiT}>{title}</Text>
      <Text style={[styles.kpiV, { color }]}>{value}</Text>
    </View>
  );
}

function ReportCard({ title, onDownload, children }: { title: string; onDownload: () => void; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity style={styles.dl} onPress={onDownload}>
          <Text style={styles.dlText}>Download Excel</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: AdminColors.text },
  sub: { color: AdminColors.muted, marginTop: 4, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: AdminColors.purple, borderColor: AdminColors.purple },
  chipText: { fontSize: 12, fontWeight: '700', color: AdminColors.text, textTransform: 'capitalize' },
  chipTextOn: { color: '#fff' },
  range: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: AdminColors.border, borderRadius: 10, padding: 10, minWidth: 140 },
  section: { fontSize: 16, fontWeight: '800', color: AdminColors.purple, marginTop: 8, marginBottom: 10 },
  kpis: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderRadius: 12, padding: 12 },
  kpiT: { fontSize: 11, color: AdminColors.muted, fontWeight: '700' },
  kpiV: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: AdminColors.border, marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontWeight: '800', color: AdminColors.text, flex: 1, paddingRight: 8 },
  dl: { backgroundColor: AdminColors.greenSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  dlText: { color: AdminColors.green, fontWeight: '800', fontSize: 11 },
  line: { fontSize: 12, color: AdminColors.text, marginBottom: 4 },
  hint: { fontSize: 11, color: AdminColors.muted, marginBottom: 8 },
  empty: { color: AdminColors.muted, fontSize: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { width: 90, fontSize: 11, color: AdminColors.muted },
  barTrack: { flex: 1, height: 8, backgroundColor: AdminColors.bg, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 99 },
  barVal: { width: 36, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});
