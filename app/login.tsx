import { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Animated,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, G, Line, Circle } from 'react-native-svg';
import { Colors, ACCENT } from '@/constants/theme';

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
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Slide DOWN from above on enter
    const slideAnim = useRef(new Animated.Value(-700)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
    }, []);

    const handleLogin = () => {
        // After login, show MPIN if set up, or go to dashboard
        // For now, let's assume it goes to dashboard or enter-mpin
        router.replace('/(tabs)');
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
                    {/* Header text */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome Back!</Text>
                        <Text style={styles.subtitle}>Driver Portal - Sign in to start earning.</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Mobile number */}
                        <TextInput
                            style={styles.input}
                            placeholder="Enter mobile number"
                            placeholderTextColor="#aaa"
                            keyboardType="phone-pad"
                            value={mobile}
                            onChangeText={setMobile}
                        />

                        {/* Password */}
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor="#aaa"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(v => !v)}
                                style={styles.eyeBtn}
                                activeOpacity={0.7}
                            >
                                <EyeIcon visible={showPassword} />
                            </TouchableOpacity>
                        </View>

                        {/* Forgot password */}
                        <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7} onPress={() => {}}>
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>

                        {/* Login button */}
                        <TouchableOpacity
                            style={styles.loginBtn}
                            activeOpacity={0.8}
                            onPress={handleLogin}
                        >
                            <Text style={styles.loginText}>LOGIN</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Bottom link */}
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
    safe: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flex: {
        flex: 1,
    },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 36,
    },

    // Header
    header: {
        marginBottom: 36,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: ACCENT,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: ACCENT,
    },

    // Form
    form: {
        gap: 14,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e8e8e8',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e8e8e8',
        borderRadius: 10,
        backgroundColor: '#ffffff',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1a1a1a',
    },
    eyeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    forgotRow: {
        alignItems: 'flex-end',
        marginTop: -4,
    },
    forgotText: {
        fontSize: 13,
        color: ACCENT,
    },
    loginBtn: {
        backgroundColor: ACCENT,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    loginText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 1.5,
    },

    // Bottom footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 28,
    },
    footerText: {
        fontSize: 13,
        color: '#666',
    },
    footerLink: {
        fontSize: 13,
        fontWeight: '700',
        color: ACCENT,
        textDecorationLine: 'underline',
    },
});
