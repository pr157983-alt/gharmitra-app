export type CustomerSession = {
  id: string | null;
  name: string;
  phone: string;
  city: string;
};

export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  city: string;
  pincode: string;
};

const ADDR_KEY = 'customer_addresses';
const CITY_KEY = 'customer_city';

function storage() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function readCustomerSession(): CustomerSession {
  const s = storage();
  if (!s) return { id: null, name: '', phone: '', city: '' };
  return {
    id: s.getItem('customer_id'),
    name: s.getItem('customer_name') || '',
    phone: s.getItem('customer_phone') || '',
    city: s.getItem(CITY_KEY) || '',
  };
}

export function clearCustomerSession() {
  const s = storage();
  if (!s) return;
  s.removeItem('customer_id');
  s.removeItem('customer_name');
  s.removeItem('customer_phone');
  s.removeItem(CITY_KEY);
}

export function setCustomerCity(city: string) {
  storage()?.setItem(CITY_KEY, city.trim());
}

export function readSavedAddresses(): SavedAddress[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(ADDR_KEY);
    const list = raw ? (JSON.parse(raw) as SavedAddress[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeSavedAddresses(list: SavedAddress[]) {
  storage()?.setItem(ADDR_KEY, JSON.stringify(list.slice(0, 8)));
}

export function deleteSavedAddress(id: string) {
  writeSavedAddresses(readSavedAddresses().filter((a) => a.id !== id));
}

export function upsertSavedAddress(addr: Omit<SavedAddress, 'id'> & { id?: string }): SavedAddress {
  const list = readSavedAddresses();
  const same = list.find(
    (a) =>
      a.line.trim().toLowerCase() === addr.line.trim().toLowerCase() &&
      a.city.trim().toLowerCase() === addr.city.trim().toLowerCase() &&
      a.pincode.trim() === addr.pincode.trim()
  );
  if (same) {
    if (addr.city) setCustomerCity(addr.city);
    return same;
  }
  const next: SavedAddress = {
    id: addr.id || `a_${Date.now()}`,
    label: addr.label || (list.length === 0 ? 'Home' : 'Other'),
    line: addr.line.trim(),
    city: addr.city.trim(),
    pincode: addr.pincode.trim(),
  };
  writeSavedAddresses([next, ...list]);
  if (next.city) setCustomerCity(next.city);
  return next;
}

export type WalletTx = { id: string; amount: number; note: string; at: string };

const WALLET_BAL = 'customer_wallet_bal';
const WALLET_TX = 'customer_wallet_tx';

export function readWalletBalance() {
  const n = Number(storage()?.getItem(WALLET_BAL) || 0);
  return Number.isFinite(n) ? n : 0;
}

export function readWalletTx(): WalletTx[] {
  try {
    const raw = storage()?.getItem(WALLET_TX);
    const list = raw ? (JSON.parse(raw) as WalletTx[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addWalletMoney(amount: number, note: string) {
  const n = Math.max(0, Number(amount) || 0);
  if (n <= 0) return readWalletBalance();
  const bal = readWalletBalance() + n;
  storage()?.setItem(WALLET_BAL, String(bal));
  const tx: WalletTx = { id: `w_${Date.now()}`, amount: n, note, at: new Date().toISOString() };
  storage()?.setItem(WALLET_TX, JSON.stringify([tx, ...readWalletTx()].slice(0, 40)));
  return bal;
}
