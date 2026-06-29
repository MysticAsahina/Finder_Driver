import { AuthContext } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/utils/axios';

const ACCENT = '#FF5F00';

const OPTIONS = [
    { icon: 'headset-outline' as const, label: 'Help Centre' },
    { icon: 'settings-outline' as const, label: 'Edit Profile' },
    { icon: 'alert-circle-outline' as const, label: 'One Tap Emergency' },
    { icon: 'document-text-outline' as const, label: 'Terms and Privacy Policy' },
    { icon: 'information-circle-outline' as const, label: 'About FINDER' },
];

export default function UserScreen() {
    const router = useRouter();
    const { setAccessToken, setUser, user } = useContext(AuthContext);

    const displayName = user
        ? `${user.firstName} ${user.lastName}`
        : 'Driver';

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        const refreshToken = await SecureStore.getItemAsync('refreshToken');
                        if (refreshToken) {
                            await api.post('/auth/logout', { refreshToken }).catch(() => { }); // non-fatal
                        }
                        await SecureStore.deleteItemAsync('refreshToken');
                        setAccessToken(null);
                        setUser(null);
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Text style={styles.title}>My Account</Text>

                {/* Profile Card */}
                <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={() => router.push('/edit-profile')}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={28} color="#999" />
                    </View>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Ionicons name="chevron-forward" size={22} color="#999" />
                </TouchableOpacity>

                {/* Options */}
                <Text style={styles.sectionLabel}>Options</Text>

                <View style={styles.optionsList}>
                    {OPTIONS.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.optionRow,
                                index < OPTIONS.length - 1 && styles.optionBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (item.label === 'Terms and Privacy Policy') {
                                    router.push('/terms');
                                } else if (item.label === 'About FINDER') {
                                    router.push('/about');
                                } else if (item.label === 'Edit Profile') {
                                    router.push('/edit-profile');
                                } else if (item.label === 'Help Centre') {
                                    router.push('/help-centre');
                                } else if (item.label === 'One Tap Emergency') {
                                    router.push('/emergency-contact');
                                }
                            }}
                        >
                            <View style={styles.optionLeft}>
                                <Ionicons name={item.icon} size={22} color={ACCENT} />
                                <Text style={styles.optionLabel}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={handleLogout}>
                    <Text style={styles.logoutText}>LOGOUT</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 100,
        flexGrow: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 16,
    },
    // Profile card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3EC',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FFD0B0',
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 28,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFD0B0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    profileName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    // Options section
    sectionLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#777',
        marginBottom: 10,
    },
    optionsList: {
        borderLeftWidth: 3,
        borderLeftColor: ACCENT,
        borderRadius: 2,
        marginLeft: 4,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 14,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    // Spacer
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    // Logout
    logoutButton: {
        backgroundColor: '#d32f2f',
        borderRadius: 50,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#d32f2f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    logoutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
});