export type PaymentStatus = 'unpaid' | 'cod' | 'online';

export type JobAddon = {
  id: string;
  name: string;
  price: number;
};

export type JobMeta = {
  payment_status?: PaymentStatus;
  cancel_reason?: string;
  reschedule_reason?: string;
  warranty_until?: string;
  is_free_visit?: boolean;
  service_charge?: number;
  parts_name?: string;
  parts_amount?: number;
  before_photo_url?: string;
  after_photo_url?: string;
  before_photo_at?: string;
  after_photo_at?: string;
  extra_technician_ids?: string[];
  addons?: JobAddon[];
  inspection_only?: boolean;
  visiting_fee?: number;
  city?: string;
  pincode?: string;
  location_extra?: number;
  location_label?: string;
  surge_extra?: number;
  coupon_code?: string;
  coupon_discount?: number;
};

const START = '__GM__';
const END = '__GM__';

export function parseJobMeta(notes: string | null | undefined): { meta: JobMeta; userNotes: string } {
  if (!notes) return { meta: {}, userNotes: '' };
  if (!notes.startsWith(START)) return { meta: {}, userNotes: notes };
  const rest = notes.slice(START.length);
  const idx = rest.indexOf(END);
  if (idx < 0) return { meta: {}, userNotes: notes };
  try {
    const meta = JSON.parse(rest.slice(0, idx)) as JobMeta;
    return { meta: meta || {}, userNotes: rest.slice(idx + END.length) };
  } catch {
    return { meta: {}, userNotes: notes };
  }
}

export function writeJobMeta(meta: JobMeta, userNotes: string) {
  return `${START}${JSON.stringify(meta)}${END}${userNotes || ''}`;
}

export function paymentLabel(status?: PaymentStatus) {
  if (status === 'online') return 'Paid UPI';
  if (status === 'cod') return 'Cash on Delivery';
  return 'Unpaid';
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addonSum(addons?: JobAddon[]) {
  return (addons || []).reduce((s, a) => s + Number(a.price || 0), 0);
}

export function jobBillTotals(bookingAmount: number, meta: JobMeta) {
  const addons = meta.addons || [];
  const addonAmt = addonSum(addons);
  if (meta.inspection_only) {
    const fee = Number(meta.visiting_fee ?? meta.service_charge ?? 0);
    return {
      inspection: true,
      service: fee,
      addons: 0,
      addonLines: [] as JobAddon[],
      parts: 0,
      location: 0,
      surge: 0,
      discount: 0,
      total: fee,
    };
  }
  const parts = Number(meta.parts_amount ?? 0);
  const location = Number(meta.location_extra || 0);
  const surge = Number(meta.surge_extra || 0);
  const discount = Number(meta.coupon_discount || 0);
  const stored = meta.service_charge;
  const service =
    stored != null && stored !== undefined
      ? Number(stored)
      : Math.max(0, Number(bookingAmount || 0) - addonAmt - location - surge + discount);
  const gross = service + addonAmt + parts + location + surge;
  return {
    inspection: false,
    service,
    addons: addonAmt,
    addonLines: addons,
    parts,
    location,
    surge,
    discount,
    total: Math.max(0, gross - discount),
  };
}
