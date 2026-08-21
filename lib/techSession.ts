import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type GeoCoords = { lat: number; lng: number };

export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition(): Promise<GeoCoords | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export async function watchPosition(callback: (coords: GeoCoords) => void): Promise<{ remove: () => void } | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return { remove: () => navigator.geolocation.clearWatch(watchId) };
  }
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude })
  );
  return { remove: () => sub.remove() };
}

export function photoStorageKey(techId: string) {
  return `tech_photo_${techId}`;
}

export function readTechPhoto(techId: string | null) {
  if (!techId) return '';
  try {
    return sessionStorage.getItem('tech_photo') || localStorage.getItem(photoStorageKey(techId)) || '';
  } catch {
    return '';
  }
}

export function saveTechPhoto(techId: string, dataUrl: string) {
  try {
    sessionStorage.setItem('tech_photo', dataUrl);
    localStorage.setItem(photoStorageKey(techId), dataUrl);
  } catch {
    try {
      sessionStorage.setItem('tech_photo', dataUrl);
    } catch {
      /* ignore */
    }
  }
}

export function pickWebImage(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export function readTechSession() {
  try {
    const id = sessionStorage.getItem('tech_id');
    return {
      id,
      name: sessionStorage.getItem('tech_name') || '',
      loggedIn: sessionStorage.getItem('tech_logged_in') === 'true',
      online: sessionStorage.getItem('tech_online') !== 'false',
      photo: readTechPhoto(id),
    };
  } catch {
    return { id: null, name: '', loggedIn: false, online: true, photo: '' };
  }
}

export function setTechOnline(on: boolean) {
  try {
    sessionStorage.setItem('tech_online', on ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function clearTechSession() {
  try {
    sessionStorage.removeItem('tech_logged_in');
    sessionStorage.removeItem('tech_id');
    sessionStorage.removeItem('tech_name');
    sessionStorage.removeItem('tech_photo');
  } catch {
    /* ignore */
  }
}
