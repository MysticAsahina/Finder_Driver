import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
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
    const { setAccessToken, setUser } = useContext(AuthContext);

    const [confirmationText, setConfirmationText] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setError(null);
        if (confirmationText !== 'DELETE') {
            setError("Please type 'DELETE' exactly to confirm.");
            return;
        }
        if (!password.trim()) {
            setError("Password is required to delete your account.");
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
                                data: { confirmationText, password }
                            });

                            // Cleanup local storage
                            await SecureStore.deleteItemAsync('refreshToken');
                            setAccessToken(null);
                            setUser(null);

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <BackArrow onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Delete Account</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
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
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Enter your password:</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        secureTextEntry
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.deleteBtn, (loading || confirmationText !== 'DELETE' || !password) && styles.deleteBtnDisabled]}
                        onPress={handleDelete}
                        disabled={loading || confirmationText !== 'DELETE' || !password}
                        activeOpacity={0.7}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.deleteBtnText}>PERMANENTLY DELETE</Text>
                        )}
                    </TouchableOpacity>
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
        marginBottom: 30,
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
        marginBottom: 20,
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
});
