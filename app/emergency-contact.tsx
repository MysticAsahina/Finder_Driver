import { useRouter } from 'expo-router';
import { useContext, useState, useEffect } from 'react';
import {
    Alert, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

// ─── Validators ───
function validateFirstName(name: string): string | null {
    if (!name || name.trim().length === 0) return 'First name is required.';
    const regex = /^[A-Za-z\s]+$/;
    if (!regex.test(name)) return 'First name can only contain letters and spaces.';
    if (name.trim().length > 50) return 'First name is too long.';
    return null;
}

function validateLastName(name: string): string | null {
    if (!name || name.trim().length === 0) return 'Last name is required.';
    const regex = /^[A-Za-z\s]+$/;
    if (!regex.test(name)) return 'Last name can only contain letters and spaces.';
    if (name.trim().length > 50) return 'Last name is too long.';
    return null;
}

function validateMobile(mobile: string): string | null {
    if (!mobile || mobile.trim().length === 0) return 'Mobile number is required.';
    const regex = /^09\d{9}$/;
    if (!regex.test(mobile)) return 'Enter a valid 11-digit mobile number starting with 09.';
    return null;
}

export default function EmergencyContactScreen() {
    const router = useRouter();
    const { emergencyContact, setEmergencyContact } = useContext(AuthContext);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    const [origFirstName, setOrigFirstName] = useState('');
    const [origLastName, setOrigLastName] = useState('');
    const [origMobileNumber, setOrigMobileNumber] = useState('');

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (emergencyContact) {
            const fn = emergencyContact.firstName || '';
            const ln = emergencyContact.lastName || '';
            const mn = emergencyContact.mobileNumber || '';
            setFirstName(fn);
            setLastName(ln);
            setMobileNumber(mn);
            setOrigFirstName(fn);
            setOrigLastName(ln);
            setOrigMobileNumber(mn);
        }
    }, [emergencyContact]);

    const hasChanges =
        firstName !== origFirstName ||
        lastName !== origLastName ||
        mobileNumber !== origMobileNumber;

    const confirmSave = async () => {
        if (isSaving) return;
        setFormErrors({});
        
        const fNameErr = validateFirstName(firstName);
        const lNameErr = validateLastName(lastName);
        const mobileErr = validateMobile(mobileNumber);

        const newErrors: Record<string, string> = {};
        if (fNameErr) newErrors.firstName = fNameErr;
        if (lNameErr) newErrors.lastName = lNameErr;
        if (mobileErr) newErrors.mobileNumber = mobileErr;

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            return;
        }

        Alert.alert(
            'Save Contact',
            'Are you sure you want to save this emergency contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: async () => {
                        setIsSaving(true);
                        try {
                            const contact = {
                                firstName: firstName.trim(),
                                lastName: lastName.trim(),
                                mobileNumber: mobileNumber.trim(),
                            };
                            await setEmergencyContact(contact);
                            setOrigFirstName(contact.firstName);
                            setOrigLastName(contact.lastName);
                            setOrigMobileNumber(contact.mobileNumber);
                            Alert.alert('Saved', 'Emergency contact saved successfully.');
                        } catch (err: any) {
                            if (err.response?.status === 429) {
                                Alert.alert('Too Many Requests', 'Please wait a moment before trying again.');
                            } else {
                                Alert.alert('Error', err.response?.data?.message || 'Failed to save emergency contact.');
                            }
                        } finally {
                            setIsSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setFirstName(origFirstName);
        setLastName(origLastName);
        setMobileNumber(origMobileNumber);
        setFormErrors({});
    };

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FF5F00" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>One Tap Emergency</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                {/* Visual Banner */}
                <View style={s.infoBanner}>
                    <Text style={s.infoBannerTitle}>Emergency Contact Settings</Text>
                    <Text style={s.infoBannerSub}>
                        Configure a trusted contact person. In case of emergency, you can notify them instantly with one tap.
                    </Text>
                </View>

                {/* Form fields */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>Contact Details</Text>
                    <View style={s.divider} />

                    {/* First Name */}
                    <Text style={s.inputLabel}>First Name</Text>
                    <TextInput
                        style={[s.input, formErrors.firstName && s.inputError]}
                        value={firstName}
                        onChangeText={(t) => { setFirstName(t); setFormErrors(prev => ({...prev, firstName: ''})); }}
                        placeholder="Enter first name"
                        placeholderTextColor="#bbb"
                        autoCapitalize="words"
                    />
                    {formErrors.firstName ? <Text style={s.errorText}>{formErrors.firstName}</Text> : null}

                    {/* Last Name */}
                    <Text style={s.inputLabel}>Last Name</Text>
                    <TextInput
                        style={[s.input, formErrors.lastName && s.inputError]}
                        value={lastName}
                        onChangeText={(t) => { setLastName(t); setFormErrors(prev => ({...prev, lastName: ''})); }}
                        placeholder="Enter last name"
                        placeholderTextColor="#bbb"
                        autoCapitalize="words"
                    />
                    {formErrors.lastName ? <Text style={s.errorText}>{formErrors.lastName}</Text> : null}

                    {/* Mobile Number */}
                    <Text style={s.inputLabel}>Mobile Number</Text>
                    <TextInput
                        style={[s.input, formErrors.mobileNumber && s.inputError]}
                        value={mobileNumber}
                        onChangeText={(t) => { setMobileNumber(t); setFormErrors(prev => ({...prev, mobileNumber: ''})); }}
                        placeholder="09XXXXXXXXX"
                        placeholderTextColor="#bbb"
                        keyboardType="phone-pad"
                        maxLength={11}
                    />
                    {formErrors.mobileNumber ? <Text style={s.errorText}>{formErrors.mobileNumber}</Text> : null}

                    {hasChanges && (
                        <View style={s.btnContainer}>
                            <TouchableOpacity
                                style={s.saveBtn}
                                activeOpacity={0.8}
                                onPress={confirmSave}
                            >
                                <Text style={s.saveBtnTxt}>Save Changes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.cancelBtn}
                                activeOpacity={0.8}
                                onPress={handleCancel}
                            >
                                <Text style={s.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FF5F00' },
    scrollContent: { paddingBottom: 40 },
    infoBanner: {
        backgroundColor: '#FFF3EC',
        padding: 20,
        marginHorizontal: 16,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FFE0CC',
    },
    infoBannerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FF5F00',
        marginBottom: 6,
    },
    infoBannerSub: {
        fontSize: 12.5,
        color: '#666',
        lineHeight: 18,
    },
    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
    divider: { height: 1, backgroundColor: '#ddd', marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1a1a1a',
        backgroundColor: '#fafafa',
        marginBottom: 16,
    },
    inputError: {
        borderColor: '#cc2222',
        borderWidth: 1.5,
        marginBottom: 4,
    },
    errorText: {
        color: '#cc2222',
        fontSize: 12,
        marginBottom: 16,
        marginLeft: 4,
    },
    btnContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
        marginBottom: 4,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#FF5F00',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF5F00',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    saveBtnTxt: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#FFF3EC',
        borderWidth: 1,
        borderColor: '#FFE0CC',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnTxt: {
        color: '#FF5F00',
        fontSize: 14,
        fontWeight: '700',
    },
});
