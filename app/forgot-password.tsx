import { ACCENT } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL      = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

type Step = 'mobile' | 'otp' | 'newPassword';

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [step,            setStep]            = useState<Step>('mobile');
    const [mobile,          setMobile]          = useState('');
    const [otp,             setOtp]             = useState('');
    const [token,           setToken]           = useState('');
    const [newPassword,     setNewPassword]     = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword,    setShowPassword]    = useState(false);
    const [showConfirm,     setShowConfirm]     = useState(false);
    const [error,           setError]           = useState<string | null>(null);
    const [loading,         setLoading]         = useState(false);

    // ── Step 1: send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        setError(null);
        if (!/^09\d{9}$/.test(mobile.trim())) {
            return setError('Please enter a valid 11-digit number starting with 09.');
        }
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/auth/forgot-password`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ mobileNumber: mobile.trim() }),
            });
            const data = await res.json();
            if (!res.ok) return setError(data.message || 'Something went wrong.');
            setToken(data.token ?? '');
            setStep('otp');
        } catch {
            setError('Unable to reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        setError(null);
        if (!otp.trim()) return setError('Please enter the OTP sent to your number.');
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code: otp.trim() }),
            });
            const data = await res.json();
            if (!res.ok) return setError(data.message || 'Invalid OTP. Please try again.');
            setToken(data.token ?? token);
            setStep('newPassword');
        } catch {
            setError('Unable to reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: reset password ────────────────────────────────────────────────
    const handleResetPassword = async () => {
        setError(null);
        if (!newPassword)                        return setError('Password is required.');
        if (newPassword.length < MIN_PASSWORD)   return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
        if (newPassword.length > MAX_PASSWORD)   return setError('Password is too long.');
        if (newPassword !== confirmPassword)     return setError('Passwords do not match.');
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/auth/forgot-password/reset`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ password: newPassword, confirmPassword }),
            });
            const data = await res.json();
            if (!res.ok) return setError(data.message || 'Something went wrong.');
            Alert.alert('Success', 'Your password has been reset.', [
                { text: 'Login', onPress: () => router.replace('/login') },
            ]);
        } catch {
            setError('Unable to reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Shared header ─────────────────────────────────────────────────────────
    const stepLabel =
        step === 'mobile'      ? 'Enter your mobile number'  :
        step === 'otp'         ? 'Enter OTP'                 :
                                 'Set new password';

    const stepSubtitle =
        step === 'mobile'      ? "We'll send a verification code to your number." :
        step === 'otp'         ? `A 6-digit code was sent to ${mobile}.`          :
                                 'Choose a strong password for your account.';

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Back button */}
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                        if (step === 'mobile') router.back();
                        else if (step === 'otp') setStep('mobile');
                        else setStep('otp');
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color={ACCENT} />
                </TouchableOpacity>

                <View style={styles.inner}>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.stepLabel}>{stepLabel}</Text>
                    <Text style={styles.subtitle}>{stepSubtitle}</Text>

                    {/* ── Step 1: Mobile ── */}
                    {step === 'mobile' && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="09XXXXXXXXX"
                                placeholderTextColor="#aaa"
                                keyboardType="phone-pad"
                                value={mobile}
                                onChangeText={(t) => { setError(null); setMobile(t.replace(/[^0-9]/g, '')); }}
                                maxLength={11}
                                editable={!loading}
                            />
                            {error && <Text style={styles.errorText}>{error}</Text>}
                            <TouchableOpacity
                                style={[styles.btn, loading && styles.btnDim]}
                                onPress={handleSendOtp}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                <Text style={styles.btnText}>{loading ? 'SENDING...' : 'SEND OTP'}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── Step 2: OTP ── */}
                    {step === 'otp' && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit code"
                                placeholderTextColor="#aaa"
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={(t) => { setError(null); setOtp(t.replace(/[^0-9]/g, '')); }}
                                maxLength={6}
                                editable={!loading}
                            />
                            {error && <Text style={styles.errorText}>{error}</Text>}
                            <TouchableOpacity
                                style={[styles.btn, loading && styles.btnDim]}
                                onPress={handleVerifyOtp}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                <Text style={styles.btnText}>{loading ? 'VERIFYING...' : 'VERIFY'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSendOtp} style={styles.resendRow} activeOpacity={0.7}>
                                <Text style={styles.resendText}>Didn't get the code? <Text style={styles.resendLink}>Resend OTP</Text></Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── Step 3: New password ── */}
                    {step === 'newPassword' && (
                        <>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="New password"
                                    placeholderTextColor="#aaa"
                                    secureTextEntry={!showPassword}
                                    value={newPassword}
                                    onChangeText={(t) => { setError(null); setNewPassword(t); }}
                                    maxLength={MAX_PASSWORD}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                                    <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#888" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#aaa"
                                    secureTextEntry={!showConfirm}
                                    value={confirmPassword}
                                    onChangeText={(t) => { setError(null); setConfirmPassword(t); }}
                                    maxLength={MAX_PASSWORD}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                                    <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={20} color="#888" />
                                </TouchableOpacity>
                            </View>
                            {error && <Text style={styles.errorText}>{error}</Text>}
                            <TouchableOpacity
                                style={[styles.btn, loading && styles.btnDim]}
                                onPress={handleResetPassword}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                <Text style={styles.btnText}>{loading ? 'RESETTING...' : 'RESET PASSWORD'}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:            { flex: 1, backgroundColor: '#fff' },
    flex:            { flex: 1 },
    backBtn:         { margin: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    inner:           { flex: 1, paddingHorizontal: 28, paddingTop: 8 },
    title:           { fontSize: 28, fontWeight: '800', color: ACCENT, marginBottom: 6 },
    stepLabel:       { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 24 },
    subtitle:        { fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 19 },
    input:           { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#fff', marginBottom: 6 },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, backgroundColor: '#fff', marginBottom: 14 },
    passwordInput:   { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },
    eyeBtn:          { paddingHorizontal: 14, paddingVertical: 14 },
    errorText:       { fontSize: 13, color: '#e53935', marginBottom: 12 },
    btn:             { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnDim:          { opacity: 0.6 },
    btnText:         { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
    resendRow:       { alignItems: 'center', marginTop: 20 },
    resendText:      { fontSize: 13, color: '#888' },
    resendLink:      { color: ACCENT, fontWeight: '700', textDecorationLine: 'underline' },
});
