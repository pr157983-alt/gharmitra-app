export type PaymentStatus = 'unpaid' | 'cod' | 'online';

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
