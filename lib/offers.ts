import { supabase, Service } from '@/lib/supabase';
import { Coupon, PromoOffer, parseService, writeServiceDescription } from '@/lib/catalogMeta';

export const OFFERS_NAME = '__gm_offers';

export type OfferStatus = 'off' | 'scheduled' | 'live' | 'expired';

async function readOffersRow() {
  const { data } = await supabase.from('services').select('*').eq('name', OFFERS_NAME).maybeSingle();
  return (data as Service) || null;
}

async function getOrCreateOffersRow(categoryId?: string) {
  const existing = await readOffersRow();
  if (existing) return existing;
  if (!categoryId) return null;
  const { data } = await supabase
    .from('services')
    .insert({
      category_id: categoryId,
      name: OFFERS_NAME,
      starting_price: 0,
      is_popular: false,
      description: writeServiceDescription({ is_system: true, enabled: false, coupons: [], promo_offers: [] }, ''),
    })
    .select()
    .single();
  return (data as Service) || null;
}

async function writeOffersMeta(row: Service, patch: { coupons?: Coupon[]; promo_offers?: PromoOffer[] }) {
  const meta = parseService(row).meta;
  const { error } = await supabase
    .from('services')
    .update({
      description: writeServiceDescription(
        {
          ...meta,
          is_system: true,
          enabled: false,
          coupons: patch.coupons ?? meta.coupons ?? [],
          promo_offers: patch.promo_offers ?? meta.promo_offers ?? [],
        },
        ''
      ),
      starting_price: 0,
      is_popular: false,
    })
    .eq('id', row.id);
  return { error: error?.message };
}

export async function loadCoupons(): Promise<Coupon[]> {
  const row = await readOffersRow();
  if (!row) return [];
  return parseService(row).meta.coupons || [];
}

export async function saveCoupons(coupons: Coupon[], categoryId: string) {
  const row = await getOrCreateOffersRow(categoryId);
  if (!row) return { error: 'No category to store coupons' };
  return writeOffersMeta(row, { coupons });
}

export async function loadPromoOffers(): Promise<PromoOffer[]> {
  const row = await readOffersRow();
  if (!row) return [];
  return parseService(row).meta.promo_offers || [];
}

export async function savePromoOffers(promo_offers: PromoOffer[], categoryId: string) {
  const row = await getOrCreateOffersRow(categoryId);
  if (!row) return { error: 'No category to store offers' };
  return writeOffersMeta(row, { promo_offers });
}

export function offerStatus(o: PromoOffer): OfferStatus {
  if (!o.enabled) return 'off';
  const now = Date.now();
  const start = o.starts_at ? new Date(o.starts_at).getTime() : 0;
  const end = o.ends_at ? new Date(o.ends_at).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(start) && now < start) return 'scheduled';
  if (Number.isFinite(end) && now > end) return 'expired';
  return 'live';
}

export function livePromoOffers(list: PromoOffer[]) {
  return list.filter((o) => offerStatus(o) === 'live');
}

export function promoToCoupon(o: PromoOffer): Coupon {
  return {
    id: o.id,
    code: (o.code || '').trim().toUpperCase(),
    percent: Number(o.percent) || 0,
    flat: Number(o.flat) || 0,
    min_amount: Number(o.min_amount) || 0,
    enabled: true,
  };
}

export function offerDiscountLabel(o: Pick<PromoOffer, 'percent' | 'flat'>) {
  if (Number(o.percent) > 0) return `${o.percent}% OFF`;
  if (Number(o.flat) > 0) return `₹${o.flat} OFF`;
  return 'Offer';
}

export function findCoupon(coupons: Coupon[], code: string, offers: PromoOffer[] = []) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  const fromCoupon = coupons.find((x) => x.enabled !== false && x.code.trim().toUpperCase() === c);
  if (fromCoupon) return fromCoupon;
  const live = livePromoOffers(offers).find((x) => x.code && x.code.trim().toUpperCase() === c);
  if (!live) return null;
  return {
    id: live.id,
    code: live.code.trim().toUpperCase(),
    percent: Number(live.percent) || 0,
    flat: Number(live.flat) || 0,
    min_amount: Number(live.min_amount) || 0,
    enabled: true,
  } as Coupon;
}
