import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { AuthContext } from '@/context/AuthContext';
import api from '@/utils/axios';

const ACCENT = '#FF5F00';

// ── Validation helpers ───────────────────────────────────────────────────────
function validateName(value: string, field: string): string | null {
    if (!value.trim()) return `${field} is required.`;
    if (value.trim().length > 50) return `${field} is too long.`;
    return null;
}
function validateMobile(value: string): string | null {
    if (!/^09\d{9}$/.test(value)) return 'Invalid mobile number format.';
    return null;
}
function validateEmail(value: string): string | null {
    if (!value.trim()) return null; // optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format.';
    if (value.length > 254) return 'Email is too long.';
    return null;
}
function validatePassword(value: string): string | null {
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (value.length > 128) return 'Password is too long.';
    return null;
}
function validateMpin(value: string): string | null {
    if (!/^\d{4}$/.test(value)) return 'MPIN must be exactly 4 digits.';
    return null;
}

// ── Eye icon ─────────────────────────────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────────────────
type FieldKey = 'firstName' | 'lastName' | 'mobileNumber' | 'email' | 'password' | 'mpin';

interface FieldConfig {
    key: FieldKey;
    label: string;
    placeholder: string;
    keyboard?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
    maxLength?: number;
    secure?: boolean;
    confirmLabel?: string;
    confirmPlaceholder?: string;
}

const FIELDS: FieldConfig[] = [
    { key: 'firstName', label: 'First Name', placeholder: 'Enter your first name', maxLength: 50 },
    { key: 'lastName', label: 'Last Name', placeholder: 'Enter your last name', maxLength: 50 },
    { key: 'mobileNumber', label: 'Mobile Number', placeholder: '09XXXXXXXXX', keyboard: 'phone-pad', maxLength: 11 },
    { key: 'email', label: 'Email', placeholder: 'Enter your email', keyboard: 'email-address', maxLength: 254 },
    {
        key: 'password', label: 'Password', placeholder: 'New password',
        secure: true, maxLength: 128,
        confirmLabel: 'Confirm Password', confirmPlaceholder: 'Re-enter new password',
    },
    {
        key: 'mpin', label: 'MPIN', placeholder: 'New 4-digit MPIN',
        secure: true, keyboard: 'number-pad', maxLength: 4,
        confirmLabel: 'Confirm MPIN', confirmPlaceholder: 'Re-enter MPIN',
    },
];

// ── Main screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
    const router = useRouter();
    const { user, setUser, accessToken } = useContext(AuthContext);

    // ── Form state ───────────────────────────────────────────────────────────
    const [editingField, setEditingField] = useState<FieldKey | null>(null);
    const [fieldValue, setFieldValue] = useState('');
    const [confirmValue, setConfirmValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingOtpData, setPendingOtpData] = useState<{ destination: string, message: string } | null>(null);
    const [otpCode, setOtpCode] = useState('');

    // ── Derived display values ───────────────────────────────────────────────
    const displayValues: Record<FieldKey, string> = {
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        mobileNumber: user?.mobileNumber ?? '',
        email: user?.email ?? '',
        password: '••••••••',
        mpin: user?.hasMpin ? '••••' : '',
    };

    // ── Open editor ──────────────────────────────────────────────────────────
    const startEditing = useCallback((key: FieldKey) => {
        setEditingField(key);
        setFieldValue(key === 'password' || key === 'mpin' ? '' : (displayValues[key] ?? ''));
        setConfirmValue('');
        setShowPassword(false);
        setShowConfirm(false);
        setError(null);
    }, [displayValues]);

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!editingField) return;
        setError(null);

        // Validate
        let validationError: string | null = null;
        switch (editingField) {
            case 'firstName': validationError = validateName(fieldValue, 'First name'); break;
            case 'lastName': validationError = validateName(fieldValue, 'Last name'); break;
            case 'mobileNumber': validationError = validateMobile(fieldValue); break;
            case 'email': validationError = validateEmail(fieldValue); break;
            case 'password':
                validationError = validatePassword(fieldValue);
                if (!validationError && fieldValue !== confirmValue) {
                    validationError = 'Passwords do not match.';
                }
                break;
            case 'mpin':
                validationError = validateMpin(fieldValue);
                if (!validationError && fieldValue !== confirmValue) {
                    validationError = 'MPINs do not match.';
                }
                break;
        }
        if (validationError) return setError(validationError);

        setSaving(true);
        try {
            const body: Record<string, string> = {};
            if (editingField === 'password') {
                body.password = fieldValue;
                body.confirmPassword = confirmValue;
            } else if (editingField === 'mpin') {
                body.mpin = fieldValue;
                body.confirmMpin = confirmValue;
            } else {
                body[editingField] = fieldValue.trim();
            }

            const res = await api.patch('/driver/edit-profile', body);
            const data = res.data;

            if (data.pendingProfileOtp) {
                setPendingOtpData({ destination: data.destination, message: data.message });
                return;
            }

            // Update context so the whole app reflects the change
            if (data.user) setUser(data.user);
            setEditingField(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Unable to reach the server.');
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) return setError("OTP must be 6 digits.");
        setSaving(true);
        setError(null);
        try {
            const res = await api.post('/driver/edit-profile/verify-update', { code: otpCode });
            if (res.data.user) setUser(res.data.user);
            setPendingOtpData(null);
            setEditingField(null);
            setOtpCode('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP.');
        } finally {
            setSaving(false);
        }
    };

    const handleResend = async () => {
        setSaving(true);
        setError(null);
        try {
            const body: Record<string, string> = {};
            if (editingField === 'password') {
                body.password = fieldValue;
                body.confirmPassword = confirmValue;
            } else if (editingField === 'mpin') {
                body.mpin = fieldValue;
                body.confirmMpin = confirmValue;
            } else if (editingField) {
                body[editingField] = fieldValue.trim();
            }

            await api.patch('/driver/edit-profile', body);
            Alert.alert("Success", "A new OTP has been sent.");
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const activeField = FIELDS.find(f => f.key === editingField);
    const initials = `${(user?.firstName ?? '')[0] ?? ''}${(user?.lastName ?? '')[0] ?? ''}`.toUpperCase();

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                {/* ── Top section (orange background) ─────────────── */}
                <View style={s.topSection}>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => editingField ? setEditingField(null) : router.back()} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={24} color={ACCENT} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>{editingField ? 'Edit Field' : 'User Profile'}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={s.avatarWrap}>
                        <View style={s.avatar}>
                            <Text style={s.avatarText}>{initials}</Text>
                        </View>
                    </View>
                </View>

                {/* ── White card ──────────────────────────────────── */}
                <ScrollView style={s.card} contentContainerStyle={s.cardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {pendingOtpData ? (
                        <>
                            <Text style={s.sectionLabel}>Verification Required</Text>
                            <View style={s.divider} />
                            <Text style={{ marginBottom: 16, color: '#333' }}>{pendingOtpData.message}</Text>
                            
                            <TextInput
                                style={s.input}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor="#aaa"
                                value={otpCode}
                                onChangeText={t => { setError(null); setOtpCode(t.replace(/[^0-9]/g, '')); }}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                            />

                            {error && <Text style={s.errorText}>{error}</Text>}

                            <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDim]} onPress={handleVerifyOtp} disabled={saving} activeOpacity={0.85}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>VERIFY</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7} onPress={() => { setPendingOtpData(null); setOtpCode(''); }}>
                                <Text style={s.deleteText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={handleResend} disabled={saving} activeOpacity={0.7}>
                                <Text style={{ color: ACCENT, fontSize: 16, fontWeight: '600' }}>Resend OTP</Text>
                            </TouchableOpacity>
                        </>
                    ) : editingField && activeField ? (
                        /* ── Inline editor ── */
                        <>
                            <Text style={s.sectionLabel}>{activeField.label}</Text>
                            <View style={s.divider} />

                            {activeField.secure ? (
                                <>
                                    {/* New value */}
                                    <View style={s.passwordRow}>
                                        <TextInput
                                            style={s.passwordInput}
                                            placeholder={activeField.placeholder}
                                            placeholderTextColor="#aaa"
                                            secureTextEntry={!showPassword}
                                            value={fieldValue}
                                            onChangeText={t => {
                                                setError(null);
                                                if (activeField.keyboard === 'number-pad') {
                                                    setFieldValue(t.replace(/[^0-9]/g, ''));
                                                } else {
                                                    setFieldValue(t);
                                                }
                                            }}
                                            maxLength={activeField.maxLength}
                                            autoCapitalize="none"
                                            keyboardType={activeField.keyboard ?? 'default'}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                                            <EyeIcon visible={showPassword} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Confirm */}
                                    <View style={[s.passwordRow, { marginTop: 12 }]}>
                                        <TextInput
                                            style={s.passwordInput}
                                            placeholder={activeField.confirmPlaceholder}
                                            placeholderTextColor="#aaa"
                                            secureTextEntry={!showConfirm}
                                            value={confirmValue}
                                            onChangeText={t => {
                                                setError(null);
                                                if (activeField.keyboard === 'number-pad') {
                                                    setConfirmValue(t.replace(/[^0-9]/g, ''));
                                                } else {
                                                    setConfirmValue(t);
                                                }
                                            }}
                                            maxLength={activeField.maxLength}
                                            autoCapitalize="none"
                                            keyboardType={activeField.keyboard ?? 'default'}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                                            <EyeIcon visible={showConfirm} />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <TextInput
                                    style={s.input}
                                    placeholder={activeField.placeholder}
                                    placeholderTextColor="#aaa"
                                    value={fieldValue}
                                    onChangeText={t => {
                                        setError(null);
                                        if (activeField.keyboard === 'phone-pad') {
                                            setFieldValue(t.replace(/[^0-9]/g, ''));
                                        } else {
                                            setFieldValue(t);
                                        }
                                    }}
                                    keyboardType={activeField.keyboard ?? 'default'}
                                    maxLength={activeField.maxLength}
                                    autoCapitalize={activeField.key === 'email' ? 'none' : 'words'}
                                    autoFocus
                                />
                            )}

                            {error && <Text style={s.errorText}>{error}</Text>}

                            <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDim]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.saveBtnText}>SAVE</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* ── Field list ── */
                        <>
                            <Text style={s.sectionLabel}>Personal details</Text>
                            <View style={s.divider} />

                            {FIELDS.map(f => (
                                <TouchableOpacity key={f.key} style={s.fieldCard} activeOpacity={0.7} onPress={() => startEditing(f.key)}>
                                    <View style={s.fieldInfo}>
                                        <Text style={s.fieldLabel}>{f.label}</Text>
                                        <Text style={[s.fieldValue, !displayValues[f.key] && s.fieldPlaceholder]}>
                                            {displayValues[f.key] || `Add ${f.label.toLowerCase()}`}
                                        </Text>
                                    </View>
                                    <Ionicons name="pencil" size={18} color={ACCENT} />
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7}>
                                <Text style={s.deleteText}>Delete my account</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FFF3EC' },
    flex: { flex: 1 },

    // Top
    topSection: { paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: ACCENT },
    avatarWrap: { alignItems: 'center', marginTop: 8 },
    avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: ACCENT, backgroundColor: '#FFD0B0', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 24, fontWeight: '700', color: ACCENT },

    // Card
    card: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
    cardContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
    divider: { height: 1.5, backgroundColor: '#e0e0e0', marginBottom: 16 },

    // Field list
    fieldCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 14, backgroundColor: '#fff' },
    fieldInfo: { flex: 1 },
    fieldLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
    fieldValue: { fontSize: 15, fontWeight: '600', color: '#333' },
    fieldPlaceholder: { color: '#aaa', fontWeight: '400' },

    // Editor
    input: { borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#fff' },
    passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, backgroundColor: '#fff' },
    passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
    errorText: { fontSize: 13, color: '#e53935', marginTop: 8 },

    saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
    saveBtnDim: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },

    deleteBtn: { alignItems: 'center', marginTop: 20 },
    deleteText: { fontSize: 14, fontWeight: '600', color: '#333', textDecorationLine: 'underline' },
});
