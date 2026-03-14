import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const ACCENT = '#FF5F00';

type FieldType = 'name' | 'mobile' | 'email' | 'mpin';

const FIELD_CONFIG: Record<
    FieldType,
    { title: string; description: string }
> = {
    name: {
        title: 'Name',
        description: 'This name will be used to address you in the app.',
    },
    mobile: {
        title: 'Mobile number',
        description:
            'Changing your number will require a verification step to confirm ownership.',
    },
    email: {
        title: 'Email',
        description: 'Make sure this email is active so we can reach you.',
    },
    mpin: {
        title: 'MPIN',
        description: '',
    },
};

export default function EditFieldScreen() {
    const router = useRouter();
    const { field } = useLocalSearchParams<{ field: string }>();

    const fieldType = (field || 'name') as FieldType;
    const config = FIELD_CONFIG[fieldType] || FIELD_CONFIG.name;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={ACCENT} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{config.title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Accent line */}
                <View style={styles.accentLine} />

                {/* Content */}
                <View style={styles.content}>
                    {fieldType === 'mpin' ? <MpinForm /> : null}
                    {fieldType === 'name' ? <NameForm /> : null}
                    {fieldType === 'mobile' ? <MobileForm description={config.description} /> : null}
                    {fieldType === 'email' ? <EmailForm description={config.description} /> : null}
                </View>

                {/* Save Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => router.back()}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ── Name Form ── */
function NameForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    return (
        <View>
            <Text style={styles.description}>
                This name will be used to address you in the app.
            </Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder=""
            />

            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder=""
            />
        </View>
    );
}

/* ── Mobile Form ── */
function MobileForm({ description }: { description: string }) {
    const [mobile, setMobile] = useState('');

    return (
        <View>
            <Text style={styles.description}>{description}</Text>

            <Text style={styles.fieldLabel}>Mobile number</Text>
            <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                placeholder=""
                keyboardType="phone-pad"
            />
        </View>
    );
}

/* ── Email Form ── */
function EmailForm({ description }: { description: string }) {
    const [email, setEmail] = useState('');

    return (
        <View>
            <Text style={styles.description}>{description}</Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
            />
        </View>
    );
}

/* ── MPIN Form ── */
function MpinForm() {
    const [newMpin, setNewMpin] = useState('');
    const [verifyMpin, setVerifyMpin] = useState('');

    return (
        <View>
            <Text style={styles.mpinTitle}>Set Up new MPIN</Text>
            <Text style={styles.description}>
                Your MPIN adds an extra layer of security to your account. Please avoid
                using easy-to-guess combinations such as 1234, 1111, or your birthdate.
            </Text>

            <Text style={styles.fieldLabel}>New MPIN</Text>
            <TextInput
                style={styles.input}
                value={newMpin}
                onChangeText={setNewMpin}
                placeholder=""
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
            />

            <Text style={styles.fieldLabel}>Verify MPIN</Text>
            <TextInput
                style={styles.input}
                value={verifyMpin}
                onChangeText={setVerifyMpin}
                placeholder=""
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
            />
        </View>
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
    // Header
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
    accentLine: {
        height: 3,
        backgroundColor: ACCENT,
    },
    // Content
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 28,
    },
    description: {
        fontSize: 13.5,
        color: '#666',
        lineHeight: 20,
        marginBottom: 24,
    },
    mpinTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginBottom: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
        paddingLeft: 4,
    },
    input: {
        borderWidth: 0,
        borderRadius: 50,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 15,
        color: '#222',
        backgroundColor: '#f0f0f0',
        marginBottom: 22,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    // Bottom
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
    },
    saveButton: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
