import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import { useContext } from 'react';
import api from '@/utils/axios';

const ACCENT = Colors.light.tint;
const PIN_LENGTH = 4;

export default function EnterMpinScreen() {
    const router = useRouter();
    const { accessToken } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const inputRef = React.useRef<import('react-native').TextInput>(null);

    const verifyMpin = async (mpin: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/verify-mpin', { mpin });
            router.replace('/(tabs)');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid MPIN');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (val: string) => {
        if (loading) return;
        const digits = val.replace(/\D/g, '').slice(0, PIN_LENGTH);
        setPin(digits);
        
        if (digits.length === PIN_LENGTH) {
            verifyMpin(digits);
        }
    };

    const dots = Array.from({ length: PIN_LENGTH }, (_, i) => ({
        filled: i < pin.length,
    }));

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity
                style={styles.inner}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={1}
            >
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

                {/* Dots */}
                <View style={styles.dotsRow}>
                    {dots.map((dot, i) => (
                        <View
                            key={i}
                            style={[styles.dot, dot.filled && styles.dotFilled]}
                        />
                    ))}
                </View>

                {/* Forgot MPIN */}
                <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
                    <Text style={styles.forgotText}>Forgot MPIN?</Text>
                </TouchableOpacity>

                {/* Flex spacer to push content up */}
                <View style={{ flex: 2 }} />
            </TouchableOpacity>

            {/* Hidden input */}
            <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={pin}
                onChangeText={handleInput}
                keyboardType="number-pad"
                maxLength={PIN_LENGTH}
                autoFocus
                caretHidden
            />
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
    dotsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    dot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: ACCENT,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: ACCENT,
    },
    forgotBtn: {
        marginTop: 8,
    },
    forgotText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '500',
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: 1,
        height: 1,
    },
});
