import { ACCENT } from '@/constants/theme';
import { setPendingToken, setAppealSession } from '@/store/authStore';
import { clearDriverRegistration, restoreDriverRegistration } from '@/store/driverRegistrationStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import api from '@/utils/axios';

const MAX_PASSWORD = 128;

function validateMobile(v: string): string | null {
  if (!v) return 'Mobile number is required.';
  if (!/^09\d{9}$/.test(v)) return 'Please enter a valid 11-digit number starting with 09.';
  return null;
}

function validatePassword(v: string): string | null {
  if (!v) return 'Password is required.';
  if (v.length > MAX_PASSWORD) return 'Password is too long.';
  return null;
}

function EyeIcon({ visible }: { visible: boolean }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            {visible ? (
                <G stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <Circle cx="12" cy="12" r="3" />
                </G>
            ) : (
                <G stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <Line x1="1" y1="1" x2="23" y2="23" />
                </G>
            )}
        </Svg>
    );
}

export default function LoginScreen() {
    const router = useRouter();
    const [mobile,       setMobile]       = useState('');
    const [password,     setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe,   setRememberMe]   = useState(false);
    const [error,        setError]        = useState<string | null>(null);
    const [loading,      setLoading]      = useState(false);

    const slideAnim = useRef(new Animated.Value(-700)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 9,
                tension: 55,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
            }),
        ]).start();

        let mounted = true;
        async function checkUnfinishedRegistration() {
            const hasDraft = await restoreDriverRegistration();
            if (hasDraft && mounted) {
                Alert.alert(
                    'Unfinished Application',
                    'You have an incomplete driver application. Would you like to resume where you left off?',
                    [
                        {
                            text: 'Discard',
                            style: 'destructive',
                            onPress: () => clearDriverRegistration(),
                        },
                        {
                            text: 'Resume',
                            onPress: () => router.push('/driving-license'),
                        },
                    ]
                );
            }
        }
        checkUnfinishedRegistration();

        return () => {
            mounted = false;
        };
    }, []);

    const handleLogin = async () => {
        setError(null);

        const mobileError   = validateMobile(mobile.trim());
        const passwordError = validatePassword(password.trim());

        if (mobileError)   return setError(mobileError);
        if (passwordError) return setError(passwordError);

        setLoading(true);

        try {
            const res = await api.post('/auth/login', {
                mobileNumber: mobile.trim(),
                password:     password.trim(),
                role:         'driver',
                rememberMe,
            });

            const data = res.data;
            clearDriverRegistration();
            setPendingToken(data.pendingToken);
            router.push({ pathname: '/otp', params: { flow: 'login' } });

        } catch (err: any) {
            const errData = err.response?.data;
            if (err.response?.status === 403 && errData?.status === 'suspended') {
                const { suspension, appealToken } = errData;
                if (appealToken && suspension) {
                    setAppealSession(appealToken, suspension);
                }
                if (suspension?.hasPendingAppeal) {
                    router.push('/appeal-pending' as any);
                    return;
                }
                if (suspension?.canAppeal) {
                    router.push('/account-suspended' as any);
                    return;
                }
                // Quota exhausted or permanently disabled: display message directly
                setError(errData.message || 'Your account is suspended.');
                return;
            }
            setError(errData?.message || 'Unable to reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View
                    style={[
                        styles.inner,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome Back!</Text>
                        <Text style={styles.subtitle}>Driver Portal - Sign in to start earning.</Text>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="09XXXXXXXXX"
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            value={mobile}
                            onChangeText={(t) => { setError(null); setMobile(t.replace(/[^0-9]/g, '')); }}
                            maxLength={11}
                            editable={!loading}
                        />

                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor="#888"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={(t) => { setError(null); setPassword(t); }}
                                autoCapitalize="none"
                                maxLength={MAX_PASSWORD}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(v => !v)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                            >
                                <EyeIcon visible={showPassword} />
                            </TouchableOpacity>
                        </View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        {/* Remember Me + Forgot Password */}
                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={styles.rememberRow}
                                onPress={() => setRememberMe(v => !v)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.rememberLabel}>Remember me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => router.push('/forgot-password')}
                            >
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDim]}
                            activeOpacity={0.8}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginText}>
                                {loading ? 'SIGNING IN...' : 'LOGIN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to FINDER Driver?  </Text>
                    <TouchableOpacity onPress={() => router.replace('/register')} activeOpacity={0.7}>
                        <Text style={styles.footerLink}>Register now</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:            { flex: 1, backgroundColor: '#fff' },
    flex:            { flex: 1 },
    inner:           { flex: 1, paddingHorizontal: 24, paddingTop: 36 },
    header:          { marginBottom: 36 },
    title:           { fontSize: 28, fontWeight: '800', color: ACCENT, marginBottom: 6 },
    subtitle:        { fontSize: 14, fontWeight: '600', color: ACCENT },
    form:            { gap: 14 },
    input:           { borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#ffffff' },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, backgroundColor: '#ffffff' },
    passwordInput:   { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },
    eyeBtn:          { paddingHorizontal: 14, paddingVertical: 14 },
    errorText:       { fontSize: 13, color: '#e53935', marginTop: -4 },
    optionsRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 },
    rememberRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox:        { width: 18, height: 18, borderWidth: 1.5, borderColor: '#aaa', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
    checkmark:       { color: '#fff', fontSize: 11, fontWeight: '700' },
    rememberLabel:   { fontSize: 13, color: '#555' },
    forgotText:      { fontSize: 13, color: ACCENT },
    loginBtn:        { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    loginBtnDim:     { opacity: 0.6 },
    loginText:       { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
    footer:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 28 },
    footerText:      { fontSize: 13, color: '#666' },
    footerLink:      { fontSize: 13, fontWeight: '700', color: ACCENT, textDecorationLine: 'underline' },
});