import { Stack, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';

const ACCENT = '#FF5F00';

const BackArrow = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color={ACCENT} />
    </TouchableOpacity>
);

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { setAccessToken, setUser, setEmergencyContactState } = useContext(AuthContext);

    const [confirmationText, setConfirmationText] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isOtpStep, setIsOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (countdown <= 0) return;
        const interval = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [countdown]);

    const handleRequestOtp = async () => {
        setError(null);
        if (confirmationText !== 'DELETE') {
            setError("Please type 'DELETE' exactly to confirm.");
            return;
        }
        if (!password.trim()) {
            setError("Password is required to delete your account.");
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/delete-account/request-otp', {
                confirmationText,
                password
            });
            setIsOtpStep(true);
            setCountdown(60);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to request OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0 || loading) return;
        setError(null);
        setLoading(true);
        try {
            await api.post('/auth/delete-account/resend-otp');
            setCountdown(60);
            Alert.alert("Code Resent", "A new verification code has been sent to your mobile number.");
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalDelete = async () => {
        setError(null);
        if (!otpCode || otpCode.trim().length !== 6) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        Alert.alert(
            "Final Confirmation",
            "Are you absolutely sure you want to permanently delete your account? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await api.delete('/auth/delete-account', {
                                data: { confirmationText, password, code: otpCode.trim() }
                            });

                            // Cleanup local storage
                            await SecureStore.deleteItemAsync('refreshToken');
                            setAccessToken(null);
                            setUser(null);
                            setEmergencyContactState?.(null);

                            Alert.alert("Account Deleted", "Your account has been permanently deleted.");
                            router.replace('/login');
                        } catch (err: any) {
                            setError(err.response?.data?.message || 'Failed to delete account. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleBackPress = () => {
        if (isOtpStep) {
            setIsOtpStep(false);
            setError(null);
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <BackArrow onPress={handleBackPress} />
                <Text style={styles.headerTitle}>{isOtpStep ? "Verify Deletion" : "Delete Account"}</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    {!isOtpStep ? (
                        <>
                            <Text style={styles.warningTitle}>Warning: Permanent Action</Text>
                            <Text style={styles.warningText}>
                                Deleting your account will permanently remove all your data, including ride history and settings. This action cannot be undone.
                            </Text>

                            <Text style={styles.label}>Type "DELETE" to confirm:</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmationText}
                                onChangeText={setConfirmationText}
                                placeholder="DELETE"
                                placeholderTextColor="#999"
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!loading}
                            />

                            <Text style={styles.label}>Enter your password:</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(v => !v)}
                                    style={styles.eyeBtn}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#888"
                                    />
                                </TouchableOpacity>
                            </View>

                            {error && <Text style={styles.errorText}>{error}</Text>}

                            <TouchableOpacity
                                style={[styles.deleteBtn, (loading || confirmationText !== 'DELETE' || !password) && styles.deleteBtnDisabled]}
                                onPress={handleRequestOtp}
                                disabled={loading || confirmationText !== 'DELETE' || !password}
                                activeOpacity={0.7}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBtnText}>CONTINUE TO VERIFY</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.warningTitle}>SMS Verification</Text>
                            <Text style={styles.warningText}>
                                A 6-digit verification code has been sent to your registered mobile number. Please enter it to authorize permanent account deletion.
                            </Text>

                            <Text style={styles.label}>6-Digit OTP Code:</Text>
                            <TextInput
                                style={[styles.input, styles.otpInput]}
                                value={otpCode}
                                onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                                placeholder="000000"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={6}
                                editable={!loading}
                                autoFocus
                            />

                            <View style={styles.resendContainer}>
                                {countdown > 0 ? (
                                    <Text style={styles.resendTimerText}>Resend code in {countdown}s</Text>
                                ) : (
                                    <TouchableOpacity onPress={handleResendOtp} disabled={loading} activeOpacity={0.7}>
                                        <Text style={styles.resendLink}>Resend OTP Code</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {error && <Text style={styles.errorText}>{error}</Text>}

                            <TouchableOpacity
                                style={[styles.deleteBtn, (loading || otpCode.trim().length !== 6) && styles.deleteBtnDisabled]}
                                onPress={handleFinalDelete}
                                disabled={loading || otpCode.trim().length !== 6}
                                activeOpacity={0.7}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.deleteBtnText}>PERMANENTLY DELETE ACCOUNT</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backStepBtn}
                                onPress={() => { setIsOtpStep(false); setError(null); }}
                                disabled={loading}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.backStepBtnText}>Back to Account Details</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginLeft: 12,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginBottom: 10,
    },
    warningText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 20,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    eyeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    otpInput: {
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 8,
        fontWeight: 'bold',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    resendTimerText: {
        fontSize: 14,
        color: '#888',
    },
    resendLink: {
        fontSize: 14,
        color: ACCENT,
        fontWeight: '600',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 14,
        marginBottom: 16,
    },
    deleteBtn: {
        backgroundColor: '#e74c3c',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    deleteBtnDisabled: {
        backgroundColor: '#f5b7b1',
    },
    deleteBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    backStepBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 12,
    },
    backStepBtnText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    },
});
