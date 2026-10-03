import { Colors } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import api from '@/utils/axios';
import { useRouter } from 'expo-router';
import React, { useContext, useRef, useState, useEffect } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = Colors.light.tint;
const PIN_LENGTH = 4;

export default function EnterMpinScreen() {
    const router = useRouter();
    const { accessToken } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const verifyMpin = async (mpin: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/verify-mpin', { mpin });
            router.replace('/(tabs)');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid MPIN');
            setPin('');
            inputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (text: string) => {
        if (loading) return;
        setError(null);
        
        const digits = text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
        setPin(digits);

        if (digits.length === PIN_LENGTH) {
            verifyMpin(digits);
        }
    };

    const handleForgotMpin = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/forgot-mpin', {}, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            router.push({ pathname: '/otp', params: { flow: 'forgot-mpin' } });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to request MPIN reset.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.inner}>
                    {/* Logo */}
                    <View style={styles.logoRow}>
                        <Image
                            source={require('@/assets/images/logo.png')}
                            style={styles.logoImg}
                            resizeMode="contain"
                        />
                        <Text style={styles.logoText}>FINDER</Text>
                    </View>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Enter MPIN */}
                    <Text style={styles.title}>Enter MPIN</Text>
                    <Text style={styles.subtitle}>
                        Enter your MPIN to securely access{'\n'}your account.
                    </Text>

                    {/* Custom OTP Boxes layered with TextInput */}
                    <View style={styles.dotsWrapper}>
                        <View style={styles.otpRow} pointerEvents="none">
                            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.otpBox,
                                        pin.length > i ? styles.otpBoxFilled : null,
                                        error ? styles.otpBoxError : null
                                    ]}
                                >
                                    {pin.length > i && <Text style={styles.otpDot}>•</Text>}
                                </View>
                            ))}
                        </View>

                        <TextInput
                            ref={inputRef}
                            style={styles.overlayInput}
                            value={pin}
                            onChangeText={handleInput}
                            keyboardType="number-pad"
                            maxLength={PIN_LENGTH}
                            autoFocus
                            caretHidden
                        />
                    </View>

                    {/* Error Message */}
                    <View style={styles.errorContainer}>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>

                    {/* Forgot MPIN */}
                    <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7} onPress={handleForgotMpin}>
                        <Text style={styles.forgotText}>Forgot MPIN?</Text>
                    </TouchableOpacity>

                    {/* Flex spacer to push content up */}
                    <View style={{ flex: 2 }} />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    inner: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        alignSelf: 'flex-start',
    },
    logoImg: {
        width: 44,
        height: 44,
    },
    logoText: {
        fontSize: 24,
        fontWeight: '800',
        color: ACCENT,
        letterSpacing: 2,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 21,
    },
    dotsWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
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
    overlayInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
        color: 'transparent',
    },
    errorContainer: {
        minHeight: 24,
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    forgotBtn: {
        marginTop: 8,
    },
    forgotText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '500',
    },
});
