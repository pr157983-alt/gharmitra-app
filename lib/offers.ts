import { supabase, Service } from '@/lib/supabase';
import { Coupon, parseService, writeServiceDescription } from '@/lib/catalogMeta';

export const OFFERS_NAME = '__gm_offers';

async function getOrCreateOffersRow(categoryId?: string) {
  const existing = await supabase.from('services').select('*').eq('name', OFFERS_NAME).maybeSingle();
  if (existing.data) return existing.data as Service;
  if (!categoryId) return null;
  const { data } = await supabase
    .from('services')
    .insert({
      category_id: categoryId,
      name: OFFERS_NAME,
      starting_price: 0,
      is_popular: false,
      description: writeServiceDescription({ is_system: true, enabled: false, coupons: [] }, ''),
    })
    .select()
    .single();
  return (data as Service) || null;
}

export async function loadCoupons(): Promise<Coupon[]> {
  const { data } = await supabase.from('services').select('*').eq('name', OFFERS_NAME).maybeSingle();
  if (!data) return [];
  return parseService(data as Service).meta.coupons || [];
}

export async function saveCoupons(coupons: Coupon[], categoryId: string) {
  const row = await getOrCreateOffersRow(categoryId);
  if (!row) return { error: 'No category to store coupons' };
  const { error } = await supabase
    .from('services')
    .update({
      description: writeServiceDescription({ is_system: true, enabled: false, coupons }, ''),
      starting_price: 0,
      is_popular: false,
    })
    .eq('id', row.id);
  return { error: error?.message };
}

export function findCoupon(coupons: Coupon[], code: string) {
  const c = String(code || '').trim().toUpperCase();
  return coupons.find((x) => x.enabled !== false && x.code.trim().toUpperCase() === c) || null;
}
