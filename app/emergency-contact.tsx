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

export default function EmergencyContactScreen() {
    const router = useRouter();
    const { emergencyContact, setEmergencyContact } = useContext(AuthContext);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    const [origFirstName, setOrigFirstName] = useState('');
    const [origLastName, setOrigLastName] = useState('');
    const [origMobileNumber, setOrigMobileNumber] = useState('');

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

    const confirmSave = () => {
        if (!firstName.trim() || !lastName.trim() || !mobileNumber.trim()) {
            Alert.alert('Incomplete details', 'Please fill in all fields.');
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
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setFirstName(origFirstName);
        setLastName(origLastName);
        setMobileNumber(origMobileNumber);
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
                        style={s.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter first name"
                        placeholderTextColor="#bbb"
                        autoCapitalize="words"
                    />

                    {/* Last Name */}
                    <Text style={s.inputLabel}>Last Name</Text>
                    <TextInput
                        style={s.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter last name"
                        placeholderTextColor="#bbb"
                        autoCapitalize="words"
                    />

                    {/* Mobile Number */}
                    <Text style={s.inputLabel}>Mobile Number</Text>
                    <TextInput
                        style={s.input}
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#bbb"
                        keyboardType="phone-pad"
                    />

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
