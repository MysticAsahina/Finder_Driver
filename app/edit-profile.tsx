import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const ACCENT = '#FF5F00';

const PROFILE_FIELDS = [
    {
        key: 'name',
        label: 'Name',
        value: 'Marcelino Zafra',
    },
    {
        key: 'mobile',
        label: 'Mobile number',
        value: '+63 9295624051',
        verified: true,
    },
    {
        key: 'email',
        label: 'Email',
        value: 'Add an e-mail address',
        placeholder: true,
    },
    {
        key: 'mpin',
        label: 'MPIN',
        value: 'Create MPIN',
        placeholder: true,
    },
];

export default function EditProfileScreen() {
    const router = useRouter();

    // Get initials from name
    const name = 'Marcelino Zafra';
    const initials = name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <SafeAreaView style={styles.container}>
            {/* Top green section */}
            <View style={styles.topSection}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={ACCENT} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>User Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                </View>
            </View>

            {/* White card */}
            <ScrollView
                style={styles.formCard}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Personal details label */}
                <Text style={styles.sectionLabel}>Personal details</Text>
                <View style={styles.sectionDivider} />

                {/* Fields */}
                {PROFILE_FIELDS.map((field, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.fieldCard}
                        activeOpacity={0.7}
                        onPress={() => {
                            if (field.key === 'mpin') {
                                router.push('/setup-mpin');
                            } else {
                                router.push({ pathname: '/edit-field', params: { field: field.key } });
                            }
                        }}
                    >
                        <View style={styles.fieldInfo}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <Text
                                style={[
                                    styles.fieldValue,
                                    field.placeholder && styles.fieldPlaceholder,
                                ]}
                            >
                                {field.value}
                            </Text>
                            {field.verified && (
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>
                        <Ionicons name="pencil" size={18} color={ACCENT} />
                    </TouchableOpacity>
                ))}

                {/* Delete account */}
                <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7}>
                    <Text style={styles.deleteText}>Delete my account</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3EC',
    },
    // Top section
    topSection: {
        backgroundColor: '#FFF3EC',
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
    },
    avatarContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2.5,
        borderColor: ACCENT,
        backgroundColor: '#FFD0B0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: ACCENT,
    },
    // White card
    formCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -20,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 6,
    },
    sectionDivider: {
        height: 1.5,
        backgroundColor: '#e0e0e0',
        marginBottom: 16,
    },
    // Field card
    fieldCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        marginBottom: 14,
        backgroundColor: '#fff',
    },
    fieldInfo: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    fieldPlaceholder: {
        color: '#aaa',
        fontWeight: '400',
    },
    verifiedBadge: {
        backgroundColor: '#FFF3EC',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: ACCENT,
    },
    // Delete
    deleteBtn: {
        alignItems: 'center',
        marginTop: 20,
    },
    deleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textDecorationLine: 'underline',
    },
});
