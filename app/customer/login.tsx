import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  Phone,
  User,
  LogIn,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

type Mode = 'login' | 'register' | 'forgot';

export default function CustomerLoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const customerId = sessionStorage.getItem('customer_id');
      if (customerId) {
        router.replace('/(tabs)/bookings');
      }
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Sahi phone number daalein (kam se kam 10 digit)');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setError('Password kam se kam 4 character ka hona chahiye');
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (queryError) {
      setError('Network error. Phir try karein.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError('Is phone number se koi account nahi mila. Pehle register karein.');
      setLoading(false);
      return;
    }

    if (data.password !== password.trim()) {
      setError('Galat password. Phir try karein.');
      setLoading(false);
      return;
    }

    sessionStorage.setItem('customer_id', data.id);
    sessionStorage.setItem('customer_name', data.name);
    sessionStorage.setItem('customer_phone', data.phone);
    setLoading(false);
    router.replace('/(tabs)/bookings');
  };

  const handleRegister = async () => {
    setError(null);
    if (!name.trim() || name.trim().length < 2) {
      setError('Naam kam se kam 2 character ka hona chahiye');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Sahi phone number daalein (kam se kam 10 digit)');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setError('Password kam se kam 4 character ka hona chahiye');
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      setError('Password aur confirm password match nahi karte');
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (existing) {
      setError('Ye phone number pehle se registered hai. Login karein.');
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim(), password: password.trim() })
      .select()
      .single();

    if (insertError || !data) {
      setError('Account nahi ban paya. Phir try karein.');
      setLoading(false);
      return;
    }

    sessionStorage.setItem('customer_id', data.id);
    sessionStorage.setItem('customer_name', data.name);
    sessionStorage.setItem('customer_phone', data.phone);
    setLoading(false);
    router.replace('/(tabs)/bookings');
  };

  const handleForgotRequest = async () => {
    setError(null);
    setSuccess(null);
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Sahi phone number daalein');
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (!data) {
      setError('Is phone number se koi account nahi mila.');
      setLoading(false);
      return;
    }

    const token = String(Math.floor(1000 + Math.random() * 9000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from('customers')
      .update({ password_reset_token: token, password_reset_expires: expires })
      .eq('id', data.id);

    setSuccess(`Reset code: ${token} (Demo - real SMS ke liye SMS service setup karna padega)`);
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError(null);
    setSuccess(null);
    if (!phone.trim() || !newPassword.trim()) {
      setError('Phone number aur naya password dono zaroori hain');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('Password kam se kam 4 character ka hona chahiye');
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('id, password_reset_token, password_reset_expires')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (!data) {
      setError('Account nahi mila.');
      setLoading(false);
      return;
    }

    const resetCode = (typeof window !== 'undefined' ? sessionStorage.getItem('reset_code') : null) || '';
    if (!resetCode) {
      setError('Pehle reset code generate karein.');
      setLoading(false);
      return;
    }

    if (resetCode !== data.password_reset_token) {
      setError('Galat reset code.');
      setLoading(false);
      return;
    }

    if (data.password_reset_expires && new Date(data.password_reset_expires) < new Date()) {
      setError('Reset code expire ho gaya. Phir generate karein.');
      setLoading(false);
      return;
    }

    await supabase
      .from('customers')
      .update({ password: newPassword.trim(), password_reset_token: null, password_reset_expires: null })
      .eq('id', data.id);

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('reset_code');
    }
    setSuccess('Password successfully update ho gaya! Ab login karein.');
    setNewPassword('');
    setMode('login');
    setLoading(false);
  };

  const titles: Record<Mode, string> = {
    login: 'Customer Login',
    register: 'Naya Account Banayein',
    forgot: 'Password Reset',
  };

  const subtitles: Record<Mode, string> = {
    login: 'Apne bookings aur complaints dekhne ke liye login karein',
    register: 'Booking karne ke liye pehle account banayein',
    forgot: 'Apna password reset karein',
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (mode === 'login' ? router.back() : setMode('login'))}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={Colors.neutral[700]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            {mode === 'login' ? (
              <LogIn size={32} color={Colors.neutral[0]} />
            ) : mode === 'register' ? (
              <UserPlus size={32} color={Colors.neutral[0]} />
            ) : (
              <KeyRound size={32} color={Colors.neutral[0]} />
            )}
          </View>

          <Text style={styles.title}>{titles[mode]}</Text>
          <Text style={styles.subtitle}>{subtitles[mode]}</Text>

          {mode === 'register' && (
            <View style={styles.inputWrap}>
              <User size={18} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Aapka naam"
                placeholderTextColor={Colors.neutral[400]}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Phone size={18} color={Colors.neutral[400]} />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={Colors.neutral[400]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {mode === 'login' && (
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.neutral[400]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={Colors.neutral[400]} />
                ) : (
                  <Eye size={18} color={Colors.neutral[400]} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {mode === 'register' && (
            <>
              <View style={styles.inputWrap}>
                <Lock size={18} color={Colors.neutral[400]} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.neutral[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.neutral[400]} />
                  ) : (
                    <Eye size={18} color={Colors.neutral[400]} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Lock size={18} color={Colors.neutral[400]} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.neutral[400]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleForgotRequest}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.submitText}>Reset Code Generate Karein</Text>
                )}
              </TouchableOpacity>

              {success && (
                <View style={styles.successWrap}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              <View style={styles.inputWrap}>
                <KeyRound size={18} color={Colors.neutral[400]} />
                <TextInput
                  style={styles.input}
                  placeholder="4-digit reset code"
                  placeholderTextColor={Colors.neutral[400]}
                  maxLength={4}
                  keyboardType="number-pad"
                  onChangeText={(v) => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('reset_code', v.replace(/[^0-9]/g, ''));
                    }
                  }}
                />
              </View>

              <View style={styles.inputWrap}>
                <Lock size={18} color={Colors.neutral[400]} />
                <TextInput
                  style={styles.input}
                  placeholder="Naya Password"
                  placeholderTextColor={Colors.neutral[400]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.submitText}>Password Update Karein</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {error && (
            <View style={styles.errorWrap}>
              <AlertCircle size={16} color={Colors.error[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && mode !== 'forgot' && (
            <View style={styles.successWrap}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {mode === 'login' && (
            <>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.submitText}>Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => {
                  setMode('forgot');
                  setError(null);
                  setSuccess(null);
                }}
              >
                <Text style={styles.forgotText}>Password bhool gaye? Reset karein</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchMode}
                onPress={() => {
                  setMode('register');
                  setError(null);
                  setSuccess(null);
                }}
              >
                <Text style={styles.switchModeText}>
                  Naya account banana hai? Register karein
                </Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'register' && (
            <>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.submitText}>Register</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchMode}
                onPress={() => {
                  setMode('login');
                  setError(null);
                  setSuccess(null);
                }}
              >
                <Text style={styles.switchModeText}>
                  Pehle se account hai? Login karein
                </Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'forgot' && (
            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
            >
              <Text style={styles.switchModeText}>Wapas login par jayein</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.neutral[0], justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary[600], justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.md, marginTop: Spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.neutral[900], textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.xl },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.neutral[200], gap: Spacing.sm, marginBottom: Spacing.md,
  },
  input: { flex: 1, fontSize: 16, color: Colors.neutral[900] },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  errorText: { fontSize: 13, color: Colors.error[600], fontWeight: '600', flex: 1 },
  successWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success[50], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, marginBottom: Spacing.md,
  },
  successText: { fontSize: 13, color: Colors.success[700], fontWeight: '600', flex: 1 },
  submitBtn: {
    backgroundColor: Colors.primary[600], paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xs,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  forgotBtn: { alignItems: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  forgotText: { fontSize: 13, color: Colors.primary[600], fontWeight: '600' },
  switchMode: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  switchModeText: { fontSize: 14, color: Colors.primary[600], fontWeight: '600' },
});
