import { ImageSourcePropType } from 'react-native';

const LOCAL = {
  ac: require('../assets/images/services/ac.png'),
  cooler: require('../assets/images/services/cooler.png'),
  fridge: require('../assets/images/services/fridge.png'),
  washing: require('../assets/images/services/washing.png'),
  fan: require('../assets/images/services/fan.png'),
  geyser: require('../assets/images/services/geyser.png'),
  plumber: require('../assets/images/services/plumber.png'),
  electrician: require('../assets/images/services/electrician.png'),
  carpenter: require('../assets/images/services/carpenter.png'),
  paint: require('../assets/images/services/paint.png'),
  cleaning: require('../assets/images/services/cleaning.png'),
  chimney: require('../assets/images/services/chimney.png'),
  microwave: require('../assets/images/services/microwave.png'),
  default: require('../assets/images/services/default.png'),
};

type PhotoKey = keyof typeof LOCAL;

const RULES: { keys: string[]; key: PhotoKey }[] = [
  { keys: ['cooler', 'desert cooler', 'air cooler', 'room cooler'], key: 'cooler' },
  { keys: ['washing', 'washer', 'laundry'], key: 'washing' },
  { keys: ['fridge', 'refrigerator', 'freezer'], key: 'fridge' },
  { keys: ['geyser', 'water heater', 'geaser'], key: 'geyser' },
  { keys: ['chimney', 'hob'], key: 'chimney' },
  { keys: ['microwave', 'oven', 'otg'], key: 'microwave' },
  { keys: ['air cond', 'split ac', 'window ac', 'ac repair', 'ac service'], key: 'ac' },
  { keys: ['plumb', 'nalkar', 'tap', 'pipe'], key: 'plumber' },
  { keys: ['electric', 'bijli', 'wiring', 'switch'], key: 'electrician' },
  { keys: ['carpenter', 'wood', 'furniture'], key: 'carpenter' },
  { keys: ['paint', 'painter'], key: 'paint' },
  { keys: ['clean', 'safai', 'maid'], key: 'cleaning' },
  { keys: ['pest', 'termite'], key: 'cleaning' },
];

export function matchPhotoKey(name: string): PhotoKey | null {
  const n = ` ${String(name || '').toLowerCase()} `;
  if (/\bac\b|air.?cond/.test(n)) return 'ac';
  if (n.includes('fan') && !n.includes('fan belt')) return 'fan';
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.key;
  }
  return null;
}

export function catalogSource(name: string, _imageUrl?: string | null): ImageSourcePropType {
  const key = matchPhotoKey(name);
  return LOCAL[key || 'default'];
}

export function fallbackPhotoForName(name: string): ImageSourcePropType {
  return catalogSource(name);
}

export function catalogPhoto(name: string, imageUrl?: string | null): ImageSourcePropType {
  return catalogSource(name, imageUrl);
}
