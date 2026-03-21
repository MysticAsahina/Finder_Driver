import { Colors } from '@/constants/theme';
import {
    clearDriverRegistration,
    getDriverRegStore,
    getDriverRegToken,
    setDriverRegPassword,
} from '@/store/driverRegistrationStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const ACCENT       = Colors.light.tint;
const API_URL      = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

async function submitApplication(router: ReturnType<typeof useRouter>) {
  const token = getDriverRegToken();
  if (!token) {
    Alert.alert('Session expired', 'Please restart the registration process.');
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
        mpin:             store.mpin,
        cloudinaryPublicIds: store.cloudinaryPublicIds,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert('Submission failed', data.message || 'Something went wrong. Please try again.');
      return;
    }

    clearDriverRegistration();
    router.replace('/waiting-approval');
  } catch {
    Alert.alert('Error', 'Unable to reach the server. Please check your connection.');
  }
}

export default function CreatePasswordScreen() {
  const router = useRouter();
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [showPinModal,    setShowPinModal]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

  const handleSubmit = () => {
    setError(null);

    if (!password)                          return setError('Password is required.');
    if (password.length < MIN_PASSWORD)     return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password.length > MAX_PASSWORD)     return setError(`Password must be ${MAX_PASSWORD} characters or fewer.`);
    if (password !== confirmPassword)       return setError('Passwords do not match.');

    setDriverRegPassword(password, confirmPassword);
    setShowPinModal(true);
  };

  const handleSkip = async () => {
    setShowPinModal(false);
    setLoading(true);
    await submitApplication(router);
    setLoading(false);
  };

  const handleCreateMpin = () => {
    setShowPinModal(false);
    router.push('/setup-mpin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.topSection}>
            <Text style={styles.title}>Create Your Password</Text>
            <Text style={styles.subtitle}>Set a strong password to secure your FINDER account.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Create password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setError(null); setPassword(t); }}
                secureTextEntry={!showPassword}
                placeholder=""
                maxLength={MAX_PASSWORD}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Confirm password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(t) => { setError(null); setConfirmPassword(t); }}
                secureTextEntry={!showConfirm}
                placeholder=""
                maxLength={MAX_PASSWORD}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)} activeOpacity={0.7}>
                <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={22} color="#999" />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDim]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.submitText}>{loading ? 'SUBMITTING...' : 'SUBMIT'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.modalTitle}>Set Up App PIN?</Text>
            <Text style={styles.modalDesc}>Add an extra layer of security to protect your account.</Text>

            <TouchableOpacity style={styles.createBtn} activeOpacity={0.8} onPress={handleCreateMpin}>
              <Text style={styles.createBtnText}>CREATE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.8} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>SKIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#FFF5EE' },
  flex:              { flex: 1 },
  scrollContent:     { flexGrow: 1 },
  topSection:        { backgroundColor: '#FFF5EE', paddingHorizontal: 32, paddingTop: 80, paddingBottom: 60, alignItems: 'center' },
  title:             { fontSize: 28, fontWeight: '700', color: ACCENT, marginBottom: 12, textAlign: 'center' },
  subtitle:          { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  formCard:          { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 40, minHeight: 400 },
  fieldLabel:        { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 10 },
  inputContainer:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 24, paddingRight: 4 },
  input:             { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, color: '#222' },
  eyeButton:         { padding: 10 },
  errorText:         { fontSize: 13, color: '#e53935', marginBottom: 16 },
  submitButton:      { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  submitButtonDim:   { opacity: 0.6 },
  submitText:        { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard:         { width: '78%', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
  lockIcon:          { fontSize: 40, marginBottom: 12 },
  modalTitle:        { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 8 },
  modalDesc:         { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  createBtn:         { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 50, paddingVertical: 14, width: '80%', alignItems: 'center', marginBottom: 12 },
  createBtnText:     { color: ACCENT, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  skipBtn:           { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 14, width: '80%', alignItems: 'center' },
  skipBtnText:       { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});