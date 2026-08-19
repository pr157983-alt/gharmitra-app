import { Service } from '@/lib/supabase';
import { Coupon, applyCoupon, parseService } from '@/lib/catalogMeta';

export function endOfTodayMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function splitCountdown(msLeft: number) {
  const ended = msLeft <= 0;
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { ended, h: pad(h), m: pad(m), s: pad(s) };
}

export function comboPricing(combo: Service, catalog: Service[]) {
  const ids = parseService(combo).meta.bundle_service_ids || [];
  const parts = ids
    .map((id) => catalog.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  const mrp = parts.reduce((n, s) => n + Number(s.starting_price || 0), 0);
  const sale = Number(combo.starting_price || 0);
  const save = Math.max(0, mrp - sale);
  const off = mrp > 0 && save > 0 ? Math.round((save / mrp) * 100) : 0;
  return {
    mrp,
    sale,
    save,
    off,
    names: parts.map((s) => s.name),
  };
}

export function couponOnPrice(price: number, coupon: Coupon | null) {
  const mrp = Number(price || 0);
  if (!coupon || mrp <= 0) return { mrp, sale: mrp, save: 0, off: 0 };
  const save = applyCoupon(coupon, mrp);
  const sale = Math.max(0, mrp - save);
  const off = save > 0 ? Math.round((save / mrp) * 100) : 0;
  return { mrp, sale, save, off };
}

export function isCombo(svc: Pick<Service, 'description'>) {
  return Boolean(parseService(svc).meta.is_bundle);
}
