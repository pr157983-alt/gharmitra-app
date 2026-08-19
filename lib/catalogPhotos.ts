const PHOTOS = {
  ac: 'https://images.pexels.com/photos/4489749/pexels-photo-4489749.jpeg?auto=compress&cs=tinysrgb&w=900',
  cooler: 'https://images.pexels.com/photos/5825576/pexels-photo-5825576.jpeg?auto=compress&cs=tinysrgb&w=900',
  fridge: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80',
  washing: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80',
  fan: 'https://images.unsplash.com/photo-1565538810643-b5b1c3946aa5?auto=format&fit=crop&w=900&q=80',
  geyser: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80',
  plumber: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80',
  electrician: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80',
  carpenter: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80',
  paint: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  chimney: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
  microwave: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=900&q=80',
  pest: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=900&q=80',
  default: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=900&q=80',
};

const RULES: { keys: string[]; photo: string }[] = [
  { keys: ['cooler', 'desert cooler', 'air cooler', 'room cooler'], photo: PHOTOS.cooler },
  { keys: ['washing', 'washer', 'laundry', 'washing machine'], photo: PHOTOS.washing },
  { keys: ['fridge', 'refrigerator', 'freezer'], photo: PHOTOS.fridge },
  { keys: ['geyser', 'water heater', 'geaser'], photo: PHOTOS.geyser },
  { keys: ['chimney', 'hob', 'kitchen exhaust'], photo: PHOTOS.chimney },
  { keys: ['microwave', 'oven', 'otg'], photo: PHOTOS.microwave },
  { keys: ['air cond', 'split ac', 'window ac', 'ac repair', 'ac service', 'ac '], photo: PHOTOS.ac },
  { keys: [' fan', 'ceiling fan', 'table fan'], photo: PHOTOS.fan },
  { keys: ['plumb', 'nal', 'tap', 'pipe', 'bathroom leak'], photo: PHOTOS.plumber },
  { keys: ['electric', 'bijli', 'wiring', 'switch'], photo: PHOTOS.electrician },
  { keys: ['carpenter', 'wood', 'furniture', 'door'], photo: PHOTOS.carpenter },
  { keys: ['paint', 'painter', 'wall paint'], photo: PHOTOS.paint },
  { keys: ['clean', 'safai', 'maid', 'deep clean'], photo: PHOTOS.cleaning },
  { keys: ['pest', 'termite', 'cockroach'], photo: PHOTOS.pest },
];

export function fallbackPhotoForName(name: string): string {
  const n = ` ${String(name || '').toLowerCase()} `;
  if (/\bac\b|air.?cond/.test(n)) return PHOTOS.ac;
  if (n.includes('fan') && !n.includes('fan belt')) return PHOTOS.fan;
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.photo;
  }
  return PHOTOS.default;
}

export function catalogPhoto(name: string, imageUrl?: string | null): string {
  const custom = String(imageUrl || '').trim();
  if (custom.startsWith('http://') || custom.startsWith('https://')) return custom;
  return fallbackPhotoForName(name);
}

export { PHOTOS };
