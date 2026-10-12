import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ACCENT } from '@/constants/theme';

export default function AppealPendingScreen() {
    const router = useRouter();

    const handleSupportPage = () => {
        // Can route to Help Centre or Support Chat
        router.push('/help-centre');
    };

    const handleLogout = () => {
        // Navigate back to login
        router.replace('/login');
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* Center Content */}
                <View style={styles.centerContent}>
                    <Text style={styles.title}>Appeal Pending</Text>
                    <Text style={styles.subtitle}>
                        Please wait for the administrator to review your appeal
                    </Text>

                    <TouchableOpacity
                        style={styles.supportBtn}
                        onPress={handleSupportPage}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.supportBtnText}>Support Page</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Logout Link */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.logoutText}>Logout Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    centerContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: ACCENT,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 14.5,
        fontWeight: '500',
        color: ACCENT,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 36,
        paddingHorizontal: 12,
    },
    supportBtn: {
        backgroundColor: ACCENT,
        borderRadius: 10,
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    supportBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        paddingBottom: 24,
        alignItems: 'center',
    },
    logoutText: {
        color: ACCENT,
        fontSize: 14.5,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
