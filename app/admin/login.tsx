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
} from 'react-native';
import { router } from 'expo-router';
import { Shield, Eye, Lock, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

export default function AdminLoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_logged_in') === 'true') {
      router.replace('/admin');
    }
  }, []);

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError('Please enter the PIN');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('admin_settings')
      .select('pin, viewer_pin')
      .limit(1)
      .maybeSingle();

    setLoading(false);

    if (queryError) {
      setError('Could not verify. Please try again.');
      return;
    }

    if (data) {
      if (data.pin === pin.trim()) {
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_role', 'super');
        router.replace('/admin');
      } else if (data.viewer_pin && data.viewer_pin === pin.trim()) {
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_role', 'viewer');
        router.replace('/admin');
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.inner}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={Colors.neutral[600]} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Shield size={48} color={Colors.primary[600]} />
          </View>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>
            Enter your PIN to access the management dashboard
          </Text>

          <View style={styles.inputWrap}>
            <Lock size={20} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Enter PIN"
              placeholderTextColor={Colors.neutral[400]}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              onSubmitEditing={handleLogin}
              autoFocus
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.neutral[0]} />
            ) : (
              <Text style={styles.loginButtonText}>Access Portal</Text>
            )}
          </TouchableOpacity>

          <View style={styles.hintRow}>
            <View style={styles.hintItem}>
              <Shield size={12} color={Colors.primary[600]} />
              <Text style={styles.hintText}>Admin PIN: 1234</Text>
            </View>
            <View style={styles.hintItem}>
              <Eye size={12} color={Colors.neutral[500]} />
              <Text style={styles.hintText}>Viewer PIN: 5678</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  inner: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
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
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error[600],
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  loginButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  hintRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
});
