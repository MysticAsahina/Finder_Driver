import { Colors } from '@/constants/theme';
import {
    clearDriverRegistration,
    getDriverRegStore,
    getDriverRegToken,
    setDriverRegMpin,
} from '@/store/driverRegistrationStore';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/utils/axios';

const ACCENT     = Colors.light.tint;
const PIN_LENGTH = 4;

export default function SetupMpinScreen() {
  const router = useRouter();

  const [pin,       setPin]       = useState('');
  const [confirmPin,setConfirmPin]= useState('');
  const [step,      setStep]      = useState<'create' | 'confirm'>('create');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const inputRef = useRef<TextInput>(null);

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = step === 'create' ? setPin : setConfirmPin;

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleInput = async (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setCurrentPin(digits);
    setError('');

    if (digits.length === PIN_LENGTH) {
      if (step === 'create') {
        setTimeout(() => {
          setStep('confirm');
          setConfirmPin('');
          inputRef.current?.focus();
        }, 120);
      } else {
        if (digits !== pin) {
          setError('PINs do not match. Please try again.');
          setTimeout(() => {
            setConfirmPin('');
            inputRef.current?.focus();
          }, 300);
          return;
        }

        // PINs match — store and submit
        setDriverRegMpin(digits);
        setLoading(true);

        const token = getDriverRegToken();
        if (!token) {
          Alert.alert('Session expired', 'Please restart the registration process.');
          setLoading(false);
          return;
        }

        const store = getDriverRegStore();

        try {
          await api.post('/driver-register/submit', {
              licenseImgFront:  store.licenseImgFront,
              licenseImgBack:   store.licenseImgBack,
              licenseNumber:    store.licenseNumber,
              licenseExpDate:   store.licenseExpDate,
              faceImg:          store.faceImg,
              idImg:            store.idImg,
              tricycleOR:       store.tricycleOR,
              regCert:          store.regCert,
              tricycleImgFront: store.tricycleImgFront,
              tricycleImgBack:  store.tricycleImgBack,
              motorcycleBrand:  store.motorcycleBrand,
              plateNumber:      store.plateNumber,
              password:         store.password,
              confirmPassword:  store.confirmPassword,
              mpin:             digits,
              cloudinaryPublicIds: store.cloudinaryPublicIds,
          }, {
              headers: { 'Authorization': `Bearer ${token}` }
          });

          clearDriverRegistration();
          router.replace('/waiting-approval');
        } catch (err: any) {
          if (err.response?.data?.message) {
            Alert.alert('Submission failed', err.response.data.message);
          } else {
            Alert.alert('Error', 'Unable to reach the server. Please check your connection.');
          }
          setLoading(false);
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.inner} onPress={() => inputRef.current?.focus()}>
          <Text style={styles.title}>
            {step === 'create' ? 'Create MPIN' : 'Confirm MPIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? 'Enter a 4-digit PIN to secure your account.'
              : 'Re-enter your PIN to confirm.'}
          </Text>

          {/* Custom OTP Boxes */}
          <View style={styles.otpRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  currentPin.length > i ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null
                ]}
              >
                {currentPin.length > i && <Text style={styles.otpDot}>•</Text>}
              </View>
            ))}

            {/* Hidden input overlaying the boxes */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={currentPin}
              onChangeText={handleInput}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              autoFocus
              caretHidden
            />
          </View>

          <View style={styles.errorContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
          
          <View style={styles.loadingContainer}>
            {loading && <Text style={styles.loadingText}>Submitting application...</Text>}
          </View>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  inner:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title:        { fontSize: 26, fontWeight: '700', color: ACCENT, marginBottom: 10, textAlign: 'center' },
  subtitle:     { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 40, lineHeight: 21 },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: ACCENT,
    backgroundColor: '#fff',
  },
  otpBoxError: {
    borderColor: '#e74c3c',
  },
  otpDot: {
    fontSize: 32,
    color: '#222',
    lineHeight: 38,
  },
  errorContainer: {
    minHeight: 24,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText:    { color: '#e53935', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  loadingContainer: {
    height: 24,
    justifyContent: 'center',
  },
  loadingText:  { color: '#999', fontSize: 13, textAlign: 'center' },
  cancelBtn:    { marginTop: 32, paddingVertical: 8, paddingHorizontal: 24 },
  cancelText:   { color: '#aaa', fontSize: 14 },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
});