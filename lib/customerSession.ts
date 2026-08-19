export type CustomerSession = {
  id: string | null;
  name: string;
  phone: string;
};

export function readCustomerSession(): CustomerSession {
  try {
    return {
      id: sessionStorage.getItem('customer_id'),
      name: sessionStorage.getItem('customer_name') || '',
      phone: sessionStorage.getItem('customer_phone') || '',
    };
  } catch {
    return { id: null, name: '', phone: '' };
  }
}

export function clearCustomerSession() {
  try {
    sessionStorage.removeItem('customer_id');
    sessionStorage.removeItem('customer_name');
    sessionStorage.removeItem('customer_phone');
  } catch {
    /* ignore */
  }
}
