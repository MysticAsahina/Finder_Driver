import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;
const PIN_LENGTH = 4;

export default function SetupMpinScreen() {
    const router = useRouter();

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'create' | 'confirm'>('create');
    const [error, setError] = useState('');

    const currentPin = step === 'create' ? pin : confirmPin;

    const handleInput = (val: string) => {
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
                if (digits === pin) {
                    router.replace('/waiting-approval');
                } else {
                    setError('PINs do not match. Please try again.');
                    setTimeout(() => setConfirmPin(''), 300);
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
                {/* Title */}
                <Text style={styles.title}>
                    {step === 'create' ? 'Create MPIN' : 'Confirm MPIN'}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 'create'
                        ? 'Enter a 4-digit PIN to secure your account.'
                        : 'Re-enter your PIN to confirm.'}
                </Text>

                {/* Dots + transparent input layered together */}
                <View style={styles.dotsWrapper}>
                    {/* Visual dots */}
                    <View style={styles.dotsRow} pointerEvents="none">
                        {dots.map((dot, i) => (
                            <View
                                key={i}
                                style={[styles.dot, dot.filled && styles.dotFilled]}
                            />
                        ))}
                    </View>

                    {/* Transparent TextInput covering the dots — user taps this */}
                    <TextInput
                        style={styles.overlayInput}
                        value={currentPin}
                        onChangeText={handleInput}
                        keyboardType="number-pad"
                        maxLength={PIN_LENGTH}
                        autoFocus
                        caretHidden
                        showSoftInputOnFocus
                        // Make completely invisible but still tappable
                        selectionColor="transparent"
                        underlineColorAndroid="transparent"
                    />
                </View>

                {/* Error */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Cancel */}
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
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
        color: '#999',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 21,
    },
    dotsWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 20,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    dot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2.5,
        borderColor: ACCENT,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: ACCENT,
    },
    // Transparent input sits over the dots — same size so tapping dots = tapping input
    overlayInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
        color: 'transparent',
    },
    errorText: {
        color: '#e53935',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 8,
    },
    cancelBtn: {
        marginTop: 32,
        paddingVertical: 8,
        paddingHorizontal: 24,
    },
    cancelText: {
        color: '#aaa',
        fontSize: 14,
    },
});
