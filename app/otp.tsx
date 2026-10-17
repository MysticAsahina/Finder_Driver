import { Colors } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import {
  clearAuth,
  getPendingToken,
} from '@/store/authStore';
import {
  clearDriverRegistration,
  getDriverRegToken,
  setDriverRegToken,
} from '@/store/driverRegistrationStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/utils/axios';

const ACCENT     = Colors.light.tint;
const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router  = useRouter();
  const { accessToken, setAccessToken, setUser, setEmergencyContactState } = useContext(AuthContext);
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const isLogin = flow === 'login';

  const [otp,     setOtp]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // --------------- Login OTP flow ---------------
        const token = getPendingToken();
        if (!token) {
          setError('Session expired. Please go back and try again.');
          return;
        }

        const res = await api.post('/auth/verify-otp', { code: otp.join('') }, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = res.data;

        // Store tokens and update auth context
        setAccessToken(data.accessToken);
        setUser(data.user);
        if (data.user?.emergencyContact) {
          setEmergencyContactState(data.user.emergencyContact);
        }
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        if (data.user) {
          await SecureStore.setItemAsync('userData', JSON.stringify(data.user)).catch(() => {});
        }
        clearAuth();
        router.replace('/(tabs)');

      } else if (flow === 'forgot-mpin') {
        // --------------- Forgot MPIN OTP flow ---------------
        const token = accessToken;
        if (!token) {
          setError('Session expired. Please log in again.');
          return;
        }

        await api.post('/auth/forgot-mpin/verify-otp', { code: otp.join('') }, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        setUser((prev: any) => prev ? { ...prev, hasMpin: false } : prev);
        router.replace('/(tabs)');
      } else {
        // --------------- Registration OTP flow ---------------
        const token = getDriverRegToken();
        if (!token) {
          setError('Session expired. Please go back and try again.');
          return;
        }

        const res = await api.post('/driver-register/verify-otp', { code: otp.join('') }, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = res.data;
        setDriverRegToken(data.driverRegToken);
        router.push('/driving-license');
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to reach the server. Please check your connection.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(null);
    inputRefs.current[0]?.focus();

    try {
      if (isLogin) {
        // --------------- Login resend ---------------
        const token = getPendingToken();
        if (!token) {
          setError('Session expired. Please go back and try again.');
          return;
        }

        try {
          await api.post('/auth/resend-otp', {}, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to resend OTP.');
        }

      } else if (flow === 'forgot-mpin') {
        const token = accessToken;
        if (!token) {
          setError('Session expired. Please log in again.');
          return;
        }
        try {
          await api.post('/auth/forgot-mpin', {}, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to resend OTP.');
        }
      } else {
        // --------------- Registration resend ---------------
        const token = getDriverRegToken();
        if (!token) {
          setError('Session expired. Please go back and try again.');
          return;
        }

        try {
          const res = await api.post('/driver-register/resend-otp', {}, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = res.data;
          setDriverRegToken(data.driverRegToken);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to resend OTP.');
          return;
        }
      }

    } catch (err: any) {
      setError('Failed to resend OTP.');
    }
  };

  const handleBack = () => {
    if (isLogin) {
      clearAuth();
    } else {
      clearDriverRegistration();
    }
    router.back();
  };

  const isFilled = otp.every(d => d !== '');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>Please enter the code</Text>
          <Text style={styles.description}>We sent a code to your mobile number</Text>

          <View style={styles.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.otpInput, otp[i] ? styles.otpInputFilled : null]}
                maxLength={1}
                keyboardType="number-pad"
                value={otp[i]}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                editable={!loading}
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, (!isFilled || loading) && styles.submitButtonDim]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!isFilled || loading}
          >
            <Text style={styles.submitText}>{loading ? 'VERIFYING...' : 'SUBMIT'}</Text>
          </TouchableOpacity>

          <Text style={styles.resendText}>
            Didn't get OTP?{' '}
            <Text style={styles.resendLink} onPress={handleResend}>Resend OTP</Text>
          </Text>

          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  flex:             { flex: 1 },
  content:          { flex: 1, paddingHorizontal: 28, paddingTop: 80, alignItems: 'center' },
  title:            { fontSize: 26, fontWeight: '700', color: ACCENT, marginBottom: 6 },
  subtitle:         { fontSize: 16, fontWeight: '600', color: ACCENT, marginBottom: 6 },
  description:      { fontSize: 13, color: '#888', marginBottom: 40 },
  otpRow:           { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpInput:         { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5', textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#222' },
  otpInputFilled:   { borderColor: ACCENT, backgroundColor: '#fff' },
  errorText:        { fontSize: 13, color: '#e53935', marginBottom: 12, textAlign: 'center' },
  submitButton:     { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', width: '100%', elevation: 2, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, marginBottom: 20 },
  submitButtonDim:  { opacity: 0.5 },
  submitText:       { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  resendText:       { fontSize: 13, color: '#888' },
  resendLink:       { color: ACCENT, fontWeight: '700', textDecorationLine: 'underline' },
  backBtn:          { marginTop: 24 },
  backText:         { fontSize: 13, color: '#aaa' },
});