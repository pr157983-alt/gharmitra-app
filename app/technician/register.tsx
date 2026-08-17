import { useState } from 'react';
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
import { Wrench, Lock, ArrowLeft, Phone, User, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';

const skillOptions = ['AC', 'Fan', 'Bijli', 'Plumber', 'Safai', 'Painting', 'Carpenter', 'Appliance'];

export default function TechnicianRegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleRegister = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Apna naam daalein');
      return;
    }
    if (phone.trim().length < 10) {
      setError('Sahi 10-digit mobile number daalein');
      return;
    }
    if (pin.trim().length < 4) {
      setError('PIN kam se kam 4 digit ka hona chahiye');
      return;
    }
    if (pin.trim() !== confirmPin.trim()) {
      setError('PIN aur Confirm PIN match nahi karte');
      return;
    }
    if (selectedSkills.length === 0) {
      setError('Kam se kam ek skill chunein');
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('technicians')
        .select('id')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (existing) {
        setError('Ye mobile number pehle se registered hai. Login karein.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('technicians').insert({
        name: name.trim(),
        phone: phone.trim(),
        pin: pin.trim(),
        skills: selectedSkills.join(', '),
        is_active: true,
      });

      if (insertError) {
        setError('Registration nahi ho paya. Phir try karein.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace('/technician/login');
      }, 2000);
    } catch {
      setError('Kuch problem aayi. Phir try karein.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={64} color={Colors.success[600]} />
          </View>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successSub}>
            Aapka account ban gaya. Ab aap apne mobile aur PIN se login kar sakte hain.
          </Text>
          <ActivityIndicator size="small" color={Colors.primary[600]} style={{ marginTop: Spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Technician Register</Text>
            <Text style={styles.subtitle}>
              Naya account banayein aur kaam shuru karein
            </Text>

            <View style={styles.inputWrap}>
              <User size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.neutral[400]}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrap}>
              <Phone size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Mobile Number (10 digits)"
                placeholderTextColor={Colors.neutral[400]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputWrap}>
              <Lock size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="PIN (4-6 digit)"
                placeholderTextColor={Colors.neutral[400]}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <View style={styles.inputWrap}>
              <Lock size={20} color={Colors.neutral[400]} />
              <TextInput
                style={styles.input}
                placeholder="Confirm PIN"
                placeholderTextColor={Colors.neutral[400]}
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                onSubmitEditing={handleRegister}
              />
            </View>

            <Text style={styles.skillLabel}>Apni Skills Chunein</Text>
            <View style={styles.skillGrid}>
              {skillOptions.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    selectedSkills.includes(skill) && styles.skillChipSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.skillText,
                      selectedSkills.includes(skill) && styles.skillTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error && (
              <View style={styles.errorWrap}>
                <AlertCircle size={14} color={Colors.error[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/technician/login')}
            >
              <Text style={styles.loginLinkText}>
                Pehle se account hai? <Text style={styles.loginLinkBold}>Login karein</Text>
              </Text>
            </TouchableOpacity>
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
  skillLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[700],
    alignSelf: 'flex-start',
    maxWidth: 320,
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    maxWidth: 320,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  skillChipSelected: {
    borderColor: Colors.accent[500],
    backgroundColor: Colors.accent[50],
  },
  skillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  skillTextSelected: {
    color: Colors.accent[600],
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
  registerButton: {
    backgroundColor: Colors.accent[500],
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  registerButtonText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  loginLink: {
    marginTop: Spacing.lg,
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  loginLinkBold: {
    fontWeight: '700',
    color: Colors.accent[600],
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  successSub: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
});
