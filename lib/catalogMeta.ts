import { Service, ServiceCategory } from '@/lib/supabase';

export type PricingType = 'fixed' | 'hourly' | 'quote';

export type ServiceAddon = {
  id: string;
  name: string;
  price: number;
};

export type CategoryMeta = {
  parent_id?: string | null;
  enabled?: boolean;
};

export type ServiceMeta = {
  pricing_type?: PricingType;
  estimated_time?: string;
  enabled?: boolean;
  banners?: string[];
  addons?: ServiceAddon[];
  visiting_fee?: number;
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
    },
    description.trim()
  );
}

export function isCategoryEnabled(cat: Pick<ServiceCategory, 'icon_name'>) {
  const { meta } = parseCategory(cat);
  return meta.enabled !== false;
}

export function isServiceEnabled(svc: Pick<Service, 'description'>) {
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
