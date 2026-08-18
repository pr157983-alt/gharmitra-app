import { Service, ServiceCategory } from '@/lib/supabase';

export type PricingType = 'fixed' | 'hourly' | 'quote';

export type ServiceAddon = {
  id: string;
  name: string;
  price: number;
};

export type LocationPrice = {
  id: string;
  city: string;
  pincode: string;
  extra: number;
};

export type SurgeRule = {
  id: string;
  label: string;
  start_hour: number;
  end_hour: number;
  extra: number;
  percent: number;
};

export type CategoryMeta = {
  parent_id?: string | null;
  enabled?: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  percent: number;
  flat: number;
  min_amount: number;
  enabled?: boolean;
};

export type ServiceMeta = {
  pricing_type?: PricingType;
  estimated_time?: string;
  enabled?: boolean;
  banners?: string[];
  addons?: ServiceAddon[];
  visiting_fee?: number;
  location_prices?: LocationPrice[];
  surge_rules?: SurgeRule[];
  is_system?: boolean;
  is_bundle?: boolean;
  bundle_service_ids?: string[];
  coupons?: Coupon[];
};

const START = '__GM__';
const END = '__GM__';

function parseWrapped<T extends object>(raw: string | null | undefined): { meta: T; rest: string } {
  if (!raw) return { meta: {} as T, rest: '' };
  if (!raw.startsWith(START)) return { meta: {} as T, rest: raw };
  const rest = raw.slice(START.length);
  const idx = rest.indexOf(END);
  if (idx < 0) return { meta: {} as T, rest: raw };
  try {
    const meta = JSON.parse(rest.slice(0, idx)) as T;
    return { meta: meta || ({} as T), rest: rest.slice(idx + END.length) };
  } catch {
    return { meta: {} as T, rest: raw };
  }
}

function writeWrapped(meta: object, rest: string) {
  return `${START}${JSON.stringify(meta)}${END}${rest || ''}`;
}

export function parseCategory(cat: Pick<ServiceCategory, 'icon_name'>): { meta: CategoryMeta; icon: string } {
  const { meta, rest } = parseWrapped<CategoryMeta>(cat.icon_name);
  return { meta, icon: rest || 'wrench' };
}

export function writeCategoryIcon(meta: CategoryMeta, icon: string) {
  return writeWrapped({ parent_id: meta.parent_id || null, enabled: meta.enabled !== false }, icon.trim() || 'wrench');
}

export function parseService(svc: Pick<Service, 'description'>): { meta: ServiceMeta; description: string } {
  const { meta, rest } = parseWrapped<ServiceMeta>(svc.description);
  return { meta, description: rest };
}

export function writeServiceDescription(meta: ServiceMeta, description: string) {
  return writeWrapped(
    {
      pricing_type: meta.pricing_type || 'fixed',
      estimated_time: meta.estimated_time || '',
      enabled: meta.enabled !== false,
      banners: (meta.banners || []).filter(Boolean),
      addons: (meta.addons || []).filter((a) => a.name?.trim()),
      visiting_fee: Number(meta.visiting_fee || 0),
      location_prices: meta.location_prices || [],
      surge_rules: meta.surge_rules || [],
      is_system: Boolean(meta.is_system),
      is_bundle: Boolean(meta.is_bundle),
      bundle_service_ids: meta.bundle_service_ids || [],
      coupons: meta.coupons || [],
    },
    description.trim()
  );
}

export function isCategoryEnabled(cat: Pick<ServiceCategory, 'icon_name'>) {
  const { meta } = parseCategory(cat);
  return meta.enabled !== false;
}

export function isSystemService(svc: Pick<Service, 'name' | 'description'>) {
  return Boolean(svc.name?.startsWith('__gm')) || Boolean(parseService(svc).meta.is_system);
}

export function isServiceEnabled(svc: Pick<Service, 'description' | 'name'>) {
  if (isSystemService(svc)) return false;
  const { meta } = parseService(svc);
  return meta.enabled !== false;
}

export function applyCoupon(coupon: Coupon, amount: number) {
  if (coupon.enabled === false) return 0;
  if (amount < Number(coupon.min_amount || 0)) return 0;
  if (Number(coupon.percent) > 0) {
    return Math.min(amount, Math.round((amount * Number(coupon.percent)) / 100));
  }
  return Math.min(amount, Number(coupon.flat || 0));
}

export function isSystemService(svc: Pick<Service, 'name' | 'description'>) {
  return svc.name?.startsWith('__gm') || Boolean(parseService(svc).meta.is_system);
}

export function isServiceEnabled(svc: Pick<Service, 'description' | 'name'>) {
  if (isSystemService(svc)) return false;
  const { meta } = parseService(svc);
  return meta.enabled !== false;
}

export function categoryParentId(cat: Pick<ServiceCategory, 'icon_name'>) {
  return parseCategory(cat).meta.parent_id || null;
}

export function topLevelCategories(categories: ServiceCategory[]) {
  return categories.filter((c) => isCategoryEnabled(c) && !categoryParentId(c));
}

export function childCategories(categories: ServiceCategory[], parentId: string) {
  return categories.filter((c) => isCategoryEnabled(c) && categoryParentId(c) === parentId);
}

export function enabledServices(services: Service[]) {
  return services.filter(isServiceEnabled);
}

export function pricingLabel(svc: Pick<Service, 'starting_price' | 'description'>) {
  const type = parseService(svc).meta.pricing_type || 'fixed';
  const price = Number(svc.starting_price || 0);
  if (type === 'hourly') return `₹${price}/hr`;
  if (type === 'quote') return 'Custom quote';
  return `₹${price} onwards`;
}

export function pricingTypeLabel(type?: PricingType) {
  if (type === 'hourly') return 'Per hour';
  if (type === 'quote') return 'Custom quote';
  return 'Fixed price';
}

export function serviceBanners(svc: Pick<Service, 'image_url' | 'description'>) {
  const extra = parseService(svc).meta.banners || [];
  const urls = [svc.image_url, ...extra].filter((u): u is string => Boolean(u && u.trim()));
  return [...new Set(urls)];
}

export function newAddonId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function addonSum(addons?: ServiceAddon[]) {
  return (addons || []).reduce((s, a) => s + Number(a.price || 0), 0);
}

export function parseSlotHour(slot: string): number {
  const m = String(slot || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) {
    const n = Number(slot);
    return Number.isFinite(n) ? n : 12;
  }
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h;
}

export function hourInWindow(hour: number, start: number, end: number) {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function matchLocationPrice(rules: LocationPrice[] | undefined, city: string, pincode: string) {
  const list = rules || [];
  const pin = String(pincode || '').replace(/\D/g, '');
  const cityN = String(city || '').trim().toLowerCase();
  const pinHits = list
    .filter((r) => {
      const p = String(r.pincode || '').replace(/\D/g, '');
      return p && pin && pin.startsWith(p);
    })
    .sort((a, b) => String(b.pincode).length - String(a.pincode).length);
  if (pinHits[0]) return pinHits[0];
  if (!cityN) return null;
  const cityHits = list.filter((r) => {
    const c = String(r.city || '').trim().toLowerCase();
    return c && (cityN.includes(c) || c.includes(cityN));
  });
  if (!cityHits.length) return null;
  return cityHits.sort((a, b) => Number(b.extra) - Number(a.extra))[0];
}

export function matchSurgeRules(rules: SurgeRule[] | undefined, slot: string) {
  const hour = parseSlotHour(slot);
  return (rules || []).filter((r) => hourInWindow(hour, Number(r.start_hour), Number(r.end_hour)));
}

export function computeLocationAndSurge(
  meta: ServiceMeta,
  city: string,
  pincode: string,
  slot: string,
  baseAmount: number
) {
  const loc = matchLocationPrice(meta.location_prices, city, pincode);
  const location_extra = Number(loc?.extra || 0);
  const location_label = loc
    ? loc.pincode
      ? `${loc.city || 'Area'} ${loc.pincode}`
      : loc.city
    : '';
  const surges = matchSurgeRules(meta.surge_rules, slot);
  const surge_flat = surges.reduce((s, r) => s + Number(r.extra || 0), 0);
  const surge_percent = surges.reduce((s, r) => s + Number(r.percent || 0), 0);
  const surge_extra = Math.round(surge_flat + ((baseAmount + location_extra) * surge_percent) / 100);
  const surge_label = surges.map((r) => r.label || 'Peak').join(', ');
  return { location_extra, location_label, surge_extra, surge_label, surges };
}
