import { AuthContext } from '@/context/AuthContext';
import api from '@/utils/axios';
import { getStoredProfilePhoto } from '@/utils/photoStorage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#FF5F00';

const OPTIONS = [
    { icon: 'wallet-outline' as const, label: 'Wallet' },
    { icon: 'headset-outline' as const, label: 'Help Centre' },
    { icon: 'settings-outline' as const, label: 'Edit Profile' },
    { icon: 'calculator-outline' as const, label: 'Fare Metrics' },
    { icon: 'alert-circle-outline' as const, label: 'One Tap Emergency' },
    { icon: 'document-text-outline' as const, label: 'Terms and Privacy Policy' },
    { icon: 'information-circle-outline' as const, label: 'About FINDER' },
    { icon: 'trash-outline' as const, label: 'Delete Account' },
];

export default function UserScreen() {
    const router = useRouter();
    const { setAccessToken, setUser, user } = useContext(AuthContext);

    useFocusEffect(
        React.useCallback(() => {
            api.get('/auth/me')
                .then(async (res) => {
                    if (res.data?.user) {
                        const savedPhoto = await getStoredProfilePhoto();
                        const fullUser = {
                            ...res.data.user,
                            profilePicture: res.data.user.profilePicture || savedPhoto,
                        };
                        setUser((prev: any) => ({
                            ...(prev || {}),
                            ...fullUser,
                        }));
                        await SecureStore.setItemAsync('userData', JSON.stringify(fullUser)).catch(() => {});
                    }
                })
                .catch(() => {
                    getStoredProfilePhoto().then((photo) => {
                        if (photo) {
                            setUser((prev: any) => prev ? { ...prev, profilePicture: prev.profilePicture || photo } : prev);
                        }
                    });
                });
        }, [setUser])
    );

    const displayName = (user?.firstName && user?.lastName)
        ? `${user.firstName} ${user.lastName}`
        : (user?.firstName || user?.lastName || 'Driver');

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
                        await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                        await SecureStore.deleteItemAsync('userData').catch(() => {});
                        try {
                            await Location.stopLocationUpdatesAsync('background-location-task');
                        } catch (err) {
                            // ignore if not running
                        }
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
                        {user?.profilePicture ? (
                            <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person" size={28} color="#999" />
                        )}
                    </View>
                    <Text style={styles.profileName}>{displayName}</Text>
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
                            onPress={async () => {
                                if (item.label === 'Wallet') {
                                    router.push('/wallet' as any);
                                } else if (item.label === 'Terms and Privacy Policy') {
                                    router.push('/terms');
                                } else if (item.label === 'About FINDER') {
                                    router.push('/about');
                                } else if (item.label === 'Edit Profile') {
                                    router.push('/edit-profile');
                                } else if (item.label === 'Fare Metrics') {
                                    try {
                                        const res = await api.get('/passenger/settings/fare');
                                        if (res.data && res.data.ordinanceUrl) {
                                            import('react-native').then(({ Linking }) => {
                                                Linking.openURL(res.data.ordinanceUrl);
                                            });
                                        } else {
                                            Alert.alert('Not Available', 'The Fare Matrix has not yet been uploaded by the admin.');
                                        }
                                    } catch (err) {
                                        Alert.alert('Error', 'Could not fetch fare matrix.');
                                    }
                                } else if (item.label === 'Help Centre') {
                                    router.push('/help-centre');
                                } else if (item.label === 'One Tap Emergency') {
                                    router.push('/emergency-contact');
                                } else if (item.label === 'Delete Account') {
                                    router.push('/delete-account' as any);
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
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