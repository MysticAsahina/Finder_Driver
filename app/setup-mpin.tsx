import { Colors } from '@/constants/theme';
import {
    clearDriverRegistration,
    getDriverRegStore,
    getDriverRegToken,
    setDriverRegMpin,
} from '@/store/driverRegistrationStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT     = Colors.light.tint;
const API_URL    = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PIN_LENGTH = 4;

export default function SetupMpinScreen() {
  const router = useRouter();

  const [pin,       setPin]       = useState('');
  const [confirmPin,setConfirmPin]= useState('');
  const [step,      setStep]      = useState<'create' | 'confirm'>('create');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const currentPin = step === 'create' ? pin : confirmPin;

  const handleInput = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, PIN_LENGTH);

    if (step === 'create') {
      setPin(digits);
    } else {
      setConfirmPin(digits);
    }
    setError('');

    if (digits.length === PIN_LENGTH) {
      if (step === 'create') {
        setTimeout(() => {
          setStep('confirm');
          setConfirmPin('');
        }, 120);
      } else {
        if (digits !== pin) {
          setError('PINs do not match. Please try again.');
          setTimeout(() => setConfirmPin(''), 300);
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
          const res = await fetch(`${API_URL}/driver-register/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
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
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            Alert.alert('Submission failed', data.message || 'Something went wrong. Please try again.');
            setLoading(false);
            return;
          }

          clearDriverRegistration();
          router.replace('/waiting-approval');
        } catch {
          Alert.alert('Error', 'Unable to reach the server. Please check your connection.');
          setLoading(false);
        }
      }
    }
  };

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => ({
    filled: i < currentPin.length,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>
          {step === 'create' ? 'Create MPIN' : 'Confirm MPIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? 'Enter a 4-digit PIN to secure your account.'
            : 'Re-enter your PIN to confirm.'}
        </Text>

        <View style={styles.dotsWrapper}>
          <View style={styles.dotsRow} pointerEvents="none">
            {dots.map((dot, i) => (
              <View key={i} style={[styles.dot, dot.filled && styles.dotFilled]} />
            ))}
          </View>
          <TextInput
            style={styles.overlayInput}
            value={currentPin}
            onChangeText={handleInput}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            autoFocus
            caretHidden
            showSoftInputOnFocus
            selectionColor="transparent"
            underlineColorAndroid="transparent"
            editable={!loading}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading && <Text style={styles.loadingText}>Submitting application...</Text>}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  inner:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title:        { fontSize: 26, fontWeight: '700', color: ACCENT, marginBottom: 10, textAlign: 'center' },
  subtitle:     { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 40, lineHeight: 21 },
  dotsWrapper:  { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  dotsRow:      { flexDirection: 'row', gap: 20, paddingVertical: 24, paddingHorizontal: 16 },
  dot:          { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: ACCENT, backgroundColor: 'transparent' },
  dotFilled:    { backgroundColor: ACCENT },
  overlayInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
  errorText:    { color: '#e53935', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  loadingText:  { color: '#999', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  cancelBtn:    { marginTop: 32, paddingVertical: 8, paddingHorizontal: 24 },
  cancelText:   { color: '#aaa', fontSize: 14 },
});