import { useEffect } from 'react';
import { router } from 'expo-router';

export default function TechnicianDashboardRedirect() {
  useEffect(() => {
    router.replace('/technician/(tabs)');
  }, []);
  return null;
}
