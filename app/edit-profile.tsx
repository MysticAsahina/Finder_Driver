import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import {
    Alert, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

// ??? Icons ????????????????????????????????????????????????????????????????????
const BackArrow = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={s.backBtn} activeOpacity={0.7}>
        <Svg width={22} height={18} viewBox="0 0 22 18">
            <G fill="none" stroke="#FF5F00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 9H2" /><Path d="M9 2L2 9l7 7" />
            </G>
        </Svg>
    </TouchableOpacity>
);

const PencilIcon = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            stroke="#FF5F00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke="#FF5F00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ??? Editable field card ???????????????????????????????????????????????????????
function FieldCard({
    label, value, placeholder, onSave, keyboardType = 'default', extra,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onSave: (v: string) => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    extra?: React.ReactNode;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const save = () => {
        onSave(draft.trim() || value);
        setEditing(false);
    };

    return (
        <View style={s.fieldCard}>
            <View style={s.fieldLeft}>
                <Text style={s.fieldLabel}>{label}</Text>
                {editing ? (
                    <TextInput
                        style={s.fieldInput}
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={save}
                        onBlur={save}
                        keyboardType={keyboardType}
                    />
                ) : (
                    <Text style={[s.fieldValue, !value && s.fieldPlaceholder]}>
                        {value || placeholder}
                    </Text>
                )}
                {extra}
            </View>
            <TouchableOpacity onPress={() => { setDraft(value); setEditing(e => !e); }} activeOpacity={0.7}>
                <PencilIcon />
            </TouchableOpacity>
        </View>
    );
}

// ??? Screen ???????????????????????????????????????????????????????????????????
export default function EditProfileScreen() {
    const router = useRouter();
    const { user, setUser } = useContext(AuthContext);

    const [firstName, setFirstName] = useState(user?.firstName || 'N/A');
    const [lastName, setLastName] = useState(user?.lastName || 'N/A');
    const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || 'N/A');
    const [email, setEmail] = useState(user?.email || 'N/A');

    const hasChanges =
        firstName !== (user?.firstName || 'N/A') ||
        lastName !== (user?.lastName || 'N/A') ||
        mobileNumber !== (user?.mobileNumber || 'N/A') ||
        email !== (user?.email || 'N/A');

    const confirmSave = () => {
        Alert.alert(
            'Save Changes',
            'Are you sure you want to save the changes to your profile?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: () => {
                        setUser({
                            ...user,
                            firstName,
                            lastName,
                            mobileNumber,
                            email,
                        });
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setFirstName(user?.firstName || 'N/A');
        setLastName(user?.lastName || 'N/A');
        setMobileNumber(user?.mobileNumber || 'N/A');
        setEmail(user?.email || 'N/A');
    };

    const profileName = `${firstName !== 'N/A' ? firstName : ''} ${lastName !== 'N/A' ? lastName : ''}`.trim();
    const initials = profileName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase() || '?';

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <BackArrow onPress={() => router.back()} />
                <Text style={s.headerTitle}>User Profile</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Avatar banner */}
                    <View style={s.avatarBanner}>
                        <View style={s.avatarCircle}>
                            <Text style={s.avatarTxt}>
                                {initials}
                            </Text>
                        </View>
                    </View>

                    {/* Personal details */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>Personal details</Text>
                        <View style={s.divider} />

                        <FieldCard
                            label="First Name"
                            value={firstName}
                            onSave={setFirstName}
                        />

                        <FieldCard
                            label="Last Name"
                            value={lastName}
                            onSave={setLastName}
                        />

                        <FieldCard
                            label="Mobile Number"
                            value={mobileNumber}
                            onSave={setMobileNumber}
                            keyboardType="phone-pad"
                            extra={
                                <View style={s.verifiedBadge}>
                                    <Text style={s.verifiedTxt}>Verified</Text>
                                </View>
                            }
                        />

                        <FieldCard
                            label="Email"
                            value={email}
                            placeholder="Add an e-mail address"
                            onSave={setEmail}
                            keyboardType="email-address"
                        />

                        {/* MPIN card as a row that routes to /setup-mpin */}
                        <TouchableOpacity
                            style={s.fieldCard}
                            activeOpacity={0.7}
                            onPress={() => router.push('/setup-mpin')}
                        >
                            <View style={s.fieldLeft}>
                                <Text style={s.fieldLabel}>MPIN</Text>
                                <Text style={[s.fieldValue, s.fieldPlaceholder]}>
                                    Create MPIN
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" style={{ marginRight: 4 }} />
                        </TouchableOpacity>

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

                    {/* Delete account */}
                    <TouchableOpacity
                        style={s.deleteBtn}
                        activeOpacity={0.7}
                        onPress={() =>
                            Alert.alert(
                                'Delete Account',
                                'Are you sure you want to delete your account? This action cannot be undone.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => router.replace('/register') },
                                ]
                            )
                        }
                    >
                        <Text style={s.deleteTxt}>Delete my account</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ??? Styles ??????????????????????????????????????????????????????????????????
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FF5F00' },

    // Avatar
    avatarBanner: {
        backgroundColor: '#FFF3EC', alignItems: 'center',
        paddingTop: 28, paddingBottom: 32,
    },
    avatarCircle: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    },
    avatarTxt: { fontSize: 24, fontWeight: '700', color: '#FF5F00' },

    // Section
    section: { paddingHorizontal: 16, paddingTop: 18 },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
    divider: { height: 1, backgroundColor: '#ddd', marginBottom: 16 },

    // Field card
    fieldCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#ffffff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e8e8e8',
        paddingHorizontal: 16, paddingVertical: 14,
        marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    fieldLeft: { flex: 1 },
    fieldLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    fieldPlaceholder: { color: '#bbb', fontWeight: '400' },
    fieldInput: {
        fontSize: 14, fontWeight: '600', color: '#1a1a1a',
        padding: 0, borderBottomWidth: 1.5, borderBottomColor: '#FF5F00',
    },

    // Verified badge
    verifiedBadge: {
        alignSelf: 'flex-start', backgroundColor: '#FFE0CC',
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6,
    },
    verifiedTxt: { fontSize: 11, fontWeight: '600', color: '#FF5F00' },

    // Delete
    deleteBtn: { alignItems: 'center', padding: 24, marginTop: 12 },
    deleteTxt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },

    // Save / Cancel buttons
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
