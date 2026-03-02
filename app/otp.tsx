import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;
const OTP_LENGTH = 6;

export default function OtpScreen() {
    const router = useRouter();
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = () => {
        router.push('/driving-license');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <Text style={styles.title}>OTP Verification</Text>
                    <Text style={styles.subtitle}>Please enter the code</Text>
                    <Text style={styles.description}>We sent a code to your mobile number</Text>

                    {/* OTP Inputs */}
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
                            />
                        ))}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                        <Text style={styles.submitText}>SUBMIT</Text>
                    </TouchableOpacity>

                    {/* Resend */}
                    <Text style={styles.resendText}>
                        Didn't get OTP?{' '}
                        <Text style={styles.resendLink}>Resend OTP</Text>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: ACCENT,
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        color: '#888',
        marginBottom: 40,
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 40,
    },
    otpInput: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#ddd',
        backgroundColor: '#f5f5f5',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#222',
    },
    otpInputFilled: {
        borderColor: ACCENT,
        backgroundColor: '#fff',
    },
    submitButton: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 18,
        alignItems: 'center',
        width: '100%',
        elevation: 2,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        marginBottom: 20,
    },
    submitText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    resendText: {
        fontSize: 13,
        color: '#888',
    },
    resendLink: {
        color: ACCENT,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
