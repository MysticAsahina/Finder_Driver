import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;

export default function CreatePasswordScreen() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);

    const handleSubmit = () => {
        setShowPinModal(true);
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
                    {/* Top cream section */}
                    <View style={styles.topSection}>
                        <Text style={styles.title}>Create Your Password</Text>
                        <Text style={styles.subtitle}>
                            Set a strong password to secure your FINDER account.
                        </Text>
                    </View>

                    {/* White card */}
                    <View style={styles.formCard}>
                        <Text style={styles.fieldLabel}>Create password</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholder=""
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>Confirm password</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                                placeholder=""
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirm(!showConfirm)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={22} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.submitText}>SUBMIT</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Set Up App PIN Modal */}
            <Modal
                visible={showPinModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPinModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.modalTitle}>Set Up App PIN?</Text>
                        <Text style={styles.modalDesc}>
                            Add an extra layer of security to protect your account.
                        </Text>

                        <TouchableOpacity
                            style={styles.createBtn}
                            activeOpacity={0.8}
                            onPress={() => { setShowPinModal(false); router.push('/setup-mpin'); }}
                        >
                            <Text style={styles.createBtnText}>CREATE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipBtn} activeOpacity={0.8} onPress={() => router.replace('/login')}>
                            <Text style={styles.skipBtnText}>SKIP</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF5EE',
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    // Top section
    topSection: {
        backgroundColor: '#FFF5EE',
        paddingHorizontal: 32,
        paddingTop: 80,
        paddingBottom: 60,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },
    // White card
    formCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 40,
        minHeight: 400,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e8e8e8',
        borderRadius: 12,
        backgroundColor: '#fafafa',
        marginBottom: 24,
        paddingRight: 4,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 15,
        color: '#222',
    },
    eyeButton: {
        padding: 10,
    },
    eyeIcon: {
        fontSize: 18,
        opacity: 0.5,
    },
    // Submit
    submitButton: {
        backgroundColor: ACCENT,
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
        opacity: 0.85,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '78%',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 28,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    lockIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 24,
    },
    createBtn: {
        borderWidth: 1.5,
        borderColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 14,
        width: '80%',
        alignItems: 'center',
        marginBottom: 12,
    },
    createBtnText: {
        color: ACCENT,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    skipBtn: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 14,
        width: '80%',
        alignItems: 'center',
    },
    skipBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
