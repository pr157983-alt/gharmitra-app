import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Wrench, Lock, ArrowLeft, Phone, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function TechnicianLoginScreen() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('tech_logged_in') === 'true') {
        const techId = sessionStorage.getItem('tech_id');
        if (techId) {
          router.replace('/technician/(tabs)');
        }
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !pin.trim()) {
      setError('Phone aur PIN dono daalein');
      return;
    }

    if (phone.trim().length < 10) {
      setError('Sahi mobile number daalein (10 digits)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('technicians')
        .select('*')
        .eq('phone', phone.trim())
        .eq('pin', pin.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) {
        setError('Server se connect nahi ho paya. Thodi der baad try karein.');
        setLoading(false);
        return;
      }

      if (data) {
        try {
          sessionStorage.setItem('tech_logged_in', 'true');
          sessionStorage.setItem('tech_id', data.id);
          sessionStorage.setItem('tech_name', data.name);
        } catch {
          // ignore
        }
        router.replace('/technician/(tabs)');
      } else {
        setError('Galat phone ya PIN. Demo: 9876543210 / 1234');
        setPin('');
        setLoading(false);
      }
    } catch (e) {
      setError('Kuch problem aayi. Phir try karein.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.neutral[600]} />
            <Text style={styles.backText}>Wapas</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Wrench size={48} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.title}>Technician Login</Text>
            <Text style={styles.subtitle}>
              Apne assigned bookings dekhne ke liye login karein
            </Text>

            <View style={styles.inputWrap}>
              <Phone size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor={Colors.neutral[400]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            </View>

            <View style={styles.inputWrap}>
              <Lock size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="PIN"
                placeholderTextColor={Colors.neutral[400]}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                onSubmitEditing={handleLogin}
              />
            </View>

            {error && (
              <View style={styles.errorWrap}>
                <AlertCircle size={14} color={Colors.error[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('/technician/register')}
            >
              <Text style={styles.registerLinkText}>
                Naya technician? <Text style={styles.registerLinkBold}>Register karein</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Demo Login</Text>
              <Text style={styles.demoText}>Mobile: 9876543210</Text>
              <Text style={styles.demoText}>PIN: 1234</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  inner: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[600] },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.neutral[900] },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    width: '100%',
    maxWidth: 320,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error[600],
    fontWeight: '600',
    flex: 1,
  },
  loginButton: {
    backgroundColor: Colors.accent[500],
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  loginButtonText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  registerLink: { marginTop: Spacing.lg },
  registerLinkText: { fontSize: 14, color: Colors.neutral[500] },
  registerLinkBold: { fontWeight: '700', color: Colors.accent[600] },
  demoCard: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.md,
    width: '100%',
    maxWidth: 320,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  demoText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
});
