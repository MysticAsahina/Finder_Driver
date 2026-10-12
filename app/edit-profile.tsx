import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useState, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
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
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { AuthContext } from '@/context/AuthContext';
import api from '@/utils/axios';
import { saveStoredProfilePhoto, getStoredProfilePhoto, removeStoredProfilePhoto, compressImageIfWeb } from '@/utils/photoStorage';

const ACCENT = '#FF5F00';

// ── Validation helpers ───────────────────────────────────────────────────────
function validateName(value: string, field: string): string | null {
    if (!value.trim()) return `${field} is required.`;
    if (value.trim().length > 50) return `${field} is too long.`;
    if (!/^[A-Za-z\s'-]+$/.test(value.trim())) return `${field} can only contain letters, spaces, hyphens, and apostrophes.`;
    return null;
}
function validateMobile(value: string): string | null {
    if (!/^09\d{9}$/.test(value)) return 'Invalid mobile number format.';
    return null;
}
function validateEmail(value: string): string | null {
    if (!value.trim()) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format.';
    if (value.length > 254) return 'Email is too long.';
    return null;
}
function validatePassword(value: string): string | null {
    if (value && value.length > 0) {
        if (value.length < 8) return 'Password must be at least 8 characters.';
        if (value.length > 128) return 'Password is too long.';
    }
    return null;
}
function validateMpin(value: string): string | null {
    if (value && value.length > 0) {
        if (!/^\d{4}$/.test(value)) return 'MPIN must be exactly 4 digits.';
    }
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

    const [formValues, setFormValues] = useState<Record<string, string>>({
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        mobileNumber: user?.mobileNumber ?? '',
        email: user?.email ?? '',
        password: '',
        confirmPassword: '',
        mpin: '',
        confirmMpin: '',
    });

    const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingOtpData, setPendingOtpData] = useState<{ destination: string, message: string } | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePicture || null);

    React.useEffect(() => {
        getStoredProfilePhoto().then((photo) => {
            if (photo) {
                setProfilePhoto(photo);
                setUser((prev: any) => ({ ...prev, profilePicture: photo }));
            }
        });
    }, []);

    const updatePhoto = async (uriOrBase64: string) => {
        try {
            const compressed = await compressImageIfWeb(uriOrBase64);
            setProfilePhoto(compressed);
            setUser((prev: any) => ({ ...prev, profilePicture: compressed }));
            await saveStoredProfilePhoto(compressed);
            Alert.alert('Success', 'Profile photo updated successfully!');
        } catch (e) {
            setProfilePhoto(uriOrBase64);
            setUser((prev: any) => ({ ...prev, profilePicture: uriOrBase64 }));
            await saveStoredProfilePhoto(uriOrBase64);
            Alert.alert('Success', 'Profile photo updated successfully!');
        }
    };

    const handlePickPhoto = async (useCamera = false) => {
        try {
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const asset = result.assets[0];
                    const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                    await updatePhoto(photoUri);
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Gallery permission is needed to select a photo.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const asset = result.assets[0];
                    const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                    await updatePhoto(photoUri);
                }
            }
        } catch (err) {
            console.error('Error selecting photo:', err);
            Alert.alert('Error', 'Failed to pick photo.');
        }
    };

    const handlePhotoOptions = () => {
        Alert.alert(
            'Profile Picture',
            'Select an option to update your photo:',
            [
                { text: 'Take Photo', onPress: () => handlePickPhoto(true) },
                { text: 'Choose from Gallery', onPress: () => handlePickPhoto(false) },
                ...(profilePhoto ? [{
                    text: 'Remove Photo',
                    style: 'destructive' as const,
                    onPress: async () => {
                        setProfilePhoto(null);
                        setUser((prev: any) => {
                            const updated = { ...prev };
                            delete updated.profilePicture;
                            return updated;
                        });
                        await removeStoredProfilePhoto();
                    }
                }] : []),
                { text: 'Cancel', style: 'cancel' as const },
            ]
        );
    };
    const [otpCode, setOtpCode] = useState('');

    const toggleEditing = (key: string) => {
        setEditingFields(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const hasChanges = useMemo(() => {
        return (
            formValues.firstName !== (user?.firstName ?? '') ||
            formValues.lastName !== (user?.lastName ?? '') ||
            formValues.mobileNumber !== (user?.mobileNumber ?? '') ||
            formValues.email !== (user?.email ?? '') ||
            formValues.password.length > 0 ||
            formValues.mpin.length > 0
        );
    }, [formValues, user]);

    const handleSave = async () => {
        setError(null);
        
        // Client-side validation
        let valError = validateName(formValues.firstName, 'First Name');
        if (valError) return setError(valError);
        valError = validateName(formValues.lastName, 'Last Name');
        if (valError) return setError(valError);
        valError = validateMobile(formValues.mobileNumber);
        if (valError) return setError(valError);
        valError = validateEmail(formValues.email);
        if (valError) return setError(valError);

        if (formValues.password) {
            valError = validatePassword(formValues.password);
            if (valError) return setError(valError);
            if (formValues.password !== formValues.confirmPassword) {
                return setError('Passwords do not match.');
            }
        }
        if (formValues.mpin) {
            valError = validateMpin(formValues.mpin);
            if (valError) return setError(valError);
            if (formValues.mpin !== formValues.confirmMpin) {
                return setError('MPINs do not match.');
            }
        }

        setSaving(true);
        try {
            const body: Record<string, string> = {
                firstName: formValues.firstName.trim(),
                lastName: formValues.lastName.trim(),
                mobileNumber: formValues.mobileNumber.trim(),
                email: formValues.email.trim(),
            };
            if (formValues.password) {
                body.password = formValues.password;
                body.confirmPassword = formValues.confirmPassword;
            }
            if (formValues.mpin) {
                body.mpin = formValues.mpin;
                body.confirmMpin = formValues.confirmMpin;
            }

            const res = await api.patch('/driver/edit-profile', body);
            const data = res.data;

            if (data.pendingProfileOtp) {
                setPendingOtpData({ destination: data.destination, message: data.message });
                return;
            }

            if (data.user) setUser({ ...data.user, profilePicture: profilePhoto || data.user.profilePicture });
            Alert.alert("Success", "Profile updated successfully.");
            
            // Reset edit state
            setEditingFields({});
            setFormValues(prev => ({ ...prev, password: '', confirmPassword: '', mpin: '', confirmMpin: '' }));
            
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
            if (res.data.user) setUser({ ...res.data.user, profilePicture: profilePhoto || res.data.user.profilePicture });
            setPendingOtpData(null);
            setEditingFields({});
            setFormValues(prev => ({ ...prev, password: '', confirmPassword: '', mpin: '', confirmMpin: '' }));
            setOtpCode('');
            Alert.alert("Success", "Profile updated successfully.");
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormValues({
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
            mobileNumber: user?.mobileNumber ?? '',
            email: user?.email ?? '',
            password: '',
            confirmPassword: '',
            mpin: '',
            confirmMpin: '',
        });
        setEditingFields({});
        setError(null);
    };

    const handleResend = async () => {
        setSaving(true);
        setError(null);
        try {
            const body: Record<string, string> = {
                firstName: formValues.firstName.trim(),
                lastName: formValues.lastName.trim(),
                mobileNumber: formValues.mobileNumber.trim(),
                email: formValues.email.trim(),
            };
            if (formValues.password) {
                body.password = formValues.password;
                body.confirmPassword = formValues.confirmPassword;
            }
            if (formValues.mpin) {
                body.mpin = formValues.mpin;
                body.confirmMpin = formValues.confirmMpin;
            }

            await api.patch('/driver/edit-profile', body);
            Alert.alert("Success", "A new OTP has been sent.");
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setSaving(false);
        }
    };

    const initials = `${(user?.firstName ?? '')[0] ?? ''}${(user?.lastName ?? '')[0] ?? ''}`.toUpperCase();

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={s.topSection}>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={24} color={ACCENT} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>User Profile</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={s.avatarWrap}>
                        <TouchableOpacity style={s.avatarTouchable} onPress={handlePhotoOptions} activeOpacity={0.8}>
                            <View style={s.avatar}>
                                {profilePhoto ? (
                                    <Image source={{ uri: profilePhoto }} style={s.avatarImg} />
                                ) : (
                                    <Text style={s.avatarText}>{initials}</Text>
                                )}
                            </View>
                            <View style={s.cameraBadge}>
                                <Ionicons name="camera" size={15} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                        <Text style={s.changePhotoText}>Tap to change photo</Text>
                    </View>
                </View>

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
                    ) : (
                        <>
                            <Text style={s.sectionLabel}>Personal details</Text>
                            <View style={s.divider} />

                            {FIELDS.map(f => {
                                const isEditing = editingFields[f.key];
                                const isSecure = f.secure;

                                return (
                                    <View key={f.key} style={[s.fieldCard, isEditing && s.fieldCardEditing]}>
                                        <View style={s.fieldInfo}>
                                            <Text style={s.fieldLabel}>{f.label}</Text>
                                            
                                            {isEditing ? (
                                                <View style={{ marginTop: 6 }}>
                                                    {isSecure ? (
                                                        <>
                                                            <View style={s.passwordRow}>
                                                                <TextInput
                                                                    style={s.passwordInput}
                                                                    placeholder={f.placeholder}
                                                                    placeholderTextColor="#aaa"
                                                                    secureTextEntry={!showPassword}
                                                                    value={formValues[f.key]}
                                                                    onChangeText={t => setFormValues(prev => ({ ...prev, [f.key]: f.keyboard === 'number-pad' ? t.replace(/[^0-9]/g, '') : t }))}
                                                                    maxLength={f.maxLength}
                                                                    autoCapitalize="none"
                                                                    keyboardType={f.keyboard ?? 'default'}
                                                                />
                                                                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                                                                    <EyeIcon visible={showPassword} />
                                                                </TouchableOpacity>
                                                            </View>
                                                            <View style={[s.passwordRow, { marginTop: 8 }]}>
                                                                <TextInput
                                                                    style={s.passwordInput}
                                                                    placeholder={f.confirmPlaceholder}
                                                                    placeholderTextColor="#aaa"
                                                                    secureTextEntry={!showConfirm}
                                                                    value={f.key === 'password' ? formValues.confirmPassword : formValues.confirmMpin}
                                                                    onChangeText={t => setFormValues(prev => ({ ...prev, [f.key === 'password' ? 'confirmPassword' : 'confirmMpin']: f.keyboard === 'number-pad' ? t.replace(/[^0-9]/g, '') : t }))}
                                                                    maxLength={f.maxLength}
                                                                    autoCapitalize="none"
                                                                    keyboardType={f.keyboard ?? 'default'}
                                                                />
                                                                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                                                                    <EyeIcon visible={showConfirm} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </>
                                                    ) : (
                                                        <TextInput
                                                            style={[s.input, { paddingVertical: 8, paddingHorizontal: 12 }]}
                                                            value={formValues[f.key]}
                                                            onChangeText={t => setFormValues(prev => ({ ...prev, [f.key]: f.keyboard === 'phone-pad' ? t.replace(/[^0-9]/g, '') : t }))}
                                                            placeholder={f.placeholder}
                                                            placeholderTextColor="#aaa"
                                                            keyboardType={f.keyboard ?? 'default'}
                                                            maxLength={f.maxLength}
                                                            autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                                                            autoFocus
                                                            onBlur={() => toggleEditing(f.key)}
                                                            onSubmitEditing={() => toggleEditing(f.key)}
                                                            returnKeyType="done"
                                                        />
                                                    )}
                                                </View>
                                            ) : (
                                                <Text style={[s.fieldValue, (!formValues[f.key] && !isSecure) && s.fieldPlaceholder]}>
                                                    {isSecure ? (formValues[f.key] ? '••••••••' : (f.key === 'password' ? '••••••••' : (user?.hasMpin ? '••••' : 'Add MPIN'))) : (formValues[f.key] || `Add ${f.label.toLowerCase()}`)}
                                                </Text>
                                            )}
                                        </View>
                                        
                                        {!isEditing && (
                                            <TouchableOpacity style={s.editBtn} activeOpacity={0.7} onPress={() => toggleEditing(f.key)}>
                                                <Ionicons name="pencil" size={18} color={ACCENT} />
                                            </TouchableOpacity>
                                        )}
                                        {isEditing && isSecure && (
                                            <TouchableOpacity style={[s.editBtn, { alignSelf: 'flex-start', marginTop: 4 }]} activeOpacity={0.7} onPress={() => toggleEditing(f.key)}>
                                                <Ionicons name="checkmark" size={24} color={ACCENT} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}

                            {error && <Text style={s.errorText}>{error}</Text>}

                            {hasChanges && (
                                <View style={{ marginTop: 20 }}>
                                    <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDim, { marginTop: 0 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>SAVE CHANGES</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7} onPress={handleCancel} disabled={saving}>
                                        <Text style={[s.deleteText, { textDecorationLine: 'none', color: '#666' }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!hasChanges && (
                                <TouchableOpacity style={s.deleteBtn} activeOpacity={0.7}>
                                    <Text style={s.deleteText}>Delete my account</Text>
                                </TouchableOpacity>
                            )}
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

    topSection: { paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: ACCENT },
    avatarWrap: { alignItems: 'center', marginTop: 8 },
    avatarTouchable: { position: 'relative' },
    avatar: { width: 78, height: 78, borderRadius: 39, borderWidth: 2.5, borderColor: ACCENT, backgroundColor: '#FFD0B0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%', borderRadius: 39 },
    avatarText: { fontSize: 24, fontWeight: '700', color: ACCENT },
    cameraBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: ACCENT, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    changePhotoText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: ACCENT },

    card: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
    cardContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
    divider: { height: 1.5, backgroundColor: '#e0e0e0', marginBottom: 16 },

    fieldCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 14, backgroundColor: '#fff' },
    fieldCardEditing: { alignItems: 'flex-start', paddingVertical: 12 },
    fieldInfo: { flex: 1 },
    fieldLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
    fieldValue: { fontSize: 15, fontWeight: '600', color: '#333' },
    fieldPlaceholder: { color: '#aaa', fontWeight: '400' },
    editBtn: { padding: 4, marginLeft: 8 },

    input: { borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#fff' },
    passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, backgroundColor: '#fff' },
    passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#1a1a1a' },
    eyeBtn: { paddingHorizontal: 10, paddingVertical: 8 },
    errorText: { fontSize: 13, color: '#e53935', marginTop: 8, textAlign: 'center' },

    saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
    saveBtnDim: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },

    deleteBtn: { alignItems: 'center', marginTop: 20 },
    deleteText: { fontSize: 14, fontWeight: '600', color: '#333', textDecorationLine: 'underline' },
});
