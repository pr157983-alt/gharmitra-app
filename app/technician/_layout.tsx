import { useEffect } from 'react';
import { Stack, usePathname, router } from 'expo-router';
import { readTechSession } from '@/lib/techSession';

export default function TechnicianLayout() {
  const pathname = usePathname();
  const isAuth = pathname?.includes('login') || pathname?.includes('register');

  useEffect(() => {
    if (isAuth) return;
    const s = readTechSession();
    if (!s.loggedIn || !s.id) router.replace('/technician/login');
  }, [pathname, isAuth]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="working-hours" />
      <Stack.Screen name="performance" />
      <Stack.Screen name="payouts" />
    </Stack>
  );
}
