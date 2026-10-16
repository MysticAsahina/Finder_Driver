import { Colors } from '@/constants/theme';
import { setDriverRegToken } from '@/store/driverRegistrationStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '@/utils/axios';

const ACCENT      = Colors.light.tint;
const MAX_NAME    = 50;

function validateFirstName(v: string): string | null {
  if (!v.trim())            return 'First name is required.';
  if (v.trim().length > MAX_NAME) return `First name must be ${MAX_NAME} characters or fewer.`;
  if (!/^[A-Za-z\s'-]+$/.test(v.trim())) return "First name can only contain letters, spaces, hyphens, and apostrophes.";
  return null;
}

function validateLastName(v: string): string | null {
  if (!v.trim())            return 'Last name is required.';
  if (v.trim().length > MAX_NAME) return `Last name must be ${MAX_NAME} characters or fewer.`;
  if (!/^[A-Za-z\s'-]+$/.test(v.trim())) return "Last name can only contain letters, spaces, hyphens, and apostrophes.";
  return null;
}

function validateMobile(v: string): string | null {
  // User types 9XXXXXXXXX (10 digits) — we prepend 0 before sending
  if (!/^9\d{9}$/.test(v)) return 'Please enter a valid 10-digit number starting with 9.';
  return null;
}

import { removeStoredProfilePhoto } from '@/utils/photoStorage';
import * as SecureStore from 'expo-secure-store';

export default function DriverRegistrationScreen() {
  const router = useRouter();
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [agreed,       setAgreed]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);

  React.useEffect(() => {
    removeStoredProfilePhoto().catch(() => {});
    SecureStore.deleteItemAsync('userData').catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError(null);

    const fnErr  = validateFirstName(firstName);
    const lnErr  = validateLastName(lastName);
    const mobErr = validateMobile(mobileNumber);

    if (fnErr)  return setError(fnErr);
    if (lnErr)  return setError(lnErr);
    if (mobErr) return setError(mobErr);
    if (!agreed) return setError('You must agree to the Terms of Use and Privacy Policy.');

    setLoading(true);
    try {
      const res = await api.post('/driver-register/send-otp', {
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
        mobileNumber: '0' + mobileNumber,
      });

      const data = res.data;
      setDriverRegToken(data.driverRegToken);
      router.push('/otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome, Driver! Tell us about yourself.</Text>
        <Text style={styles.subtitle}>
          This helps you receive booking requests and manage your trips in FINDER.
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={(t) => { setError(null); setFirstName(t); }}
            placeholder="Enter first name"
            placeholderTextColor="#888"
            maxLength={MAX_NAME}
            editable={!loading}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={(t) => { setError(null); setLastName(t); }}
            placeholder="Enter last name"
            placeholderTextColor="#888"
            maxLength={MAX_NAME}
            editable={!loading}
          />

          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇵🇭</Text>
              <Text style={styles.code}>+63</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={mobileNumber}
              onChangeText={(t) => { setError(null); setMobileNumber(t.replace(/[^0-9]/g, '')); }}
              placeholder="9XXXXXXXXX"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.agreementRow}>
          <TouchableOpacity
            style={[styles.checkbox, agreed && styles.checkboxChecked]}
            onPress={() => { setError(null); setAgreed(!agreed); }}
            activeOpacity={0.7}
          >
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.agreementText}>
            By continuing, I agree to the collection and use of my information in accordance with the FINDER{' '}
            <Text style={styles.link} onPress={() => router.push({ pathname: '/terms', params: { tab: 'terms' } })}>
              Terms of Use
            </Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={() => router.push({ pathname: '/terms', params: { tab: 'privacy' } })}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!agreed || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!agreed || loading}
        >
          <Text style={styles.submitText}>{loading ? 'SENDING...' : 'SUBMIT'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#fff' },
  scrollContent:        { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title:                { fontSize: 26, fontWeight: '700', color: ACCENT, marginBottom: 8, lineHeight: 34 },
  subtitle:             { fontSize: 13, color: '#666', marginBottom: 36, lineHeight: 19 },
  formContainer:        { marginBottom: 20 },
  label:                { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
  input:                { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#222', backgroundColor: '#fafafa', marginBottom: 20 },
  phoneRow:             { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  countryCode:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#fafafa', gap: 6 },
  flag:                 { fontSize: 18 },
  code:                 { fontSize: 15, color: '#333', fontWeight: '500' },
  phoneInput:           { flex: 1, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#222', backgroundColor: '#fafafa' },
  errorText:            { fontSize: 13, color: '#e53935', marginBottom: 16 },
  agreementRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32, gap: 12 },
  checkbox:             { width: 22, height: 22, borderWidth: 1.5, borderColor: '#999', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0, backgroundColor: '#fff' },
  checkboxChecked:      { backgroundColor: ACCENT, borderColor: ACCENT },
  checkmark:            { color: '#fff', fontSize: 13, fontWeight: '700' },
  agreementText:        { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },
  link:                 { color: ACCENT, fontWeight: '700', textDecorationLine: 'underline' },
  submitButton:         { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', elevation: 2, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText:           { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  footer:               { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 20 },
  footerText:           { fontSize: 14, color: '#666' },
  footerLink:           { fontSize: 14, color: ACCENT, fontWeight: '700', textDecorationLine: 'underline' },
});