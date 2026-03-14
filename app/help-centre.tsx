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

export default function HelpCentreScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <View style={styles.closeCircle}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Centre</Text>
                <View style={{ width: 34 }} />
            </View>

            <View style={styles.divider} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Options Card */}
                <View style={styles.optionsCard}>
                    <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={() => router.push('/faqs')}>
                        <Text style={styles.optionText}>Frequently asked questions</Text>
                        <Ionicons name="chevron-forward" size={22} color="#999" />
                    </TouchableOpacity>

                    <View style={styles.optionDivider} />

                    <TouchableOpacity style={styles.optionRow} activeOpacity={0.7} onPress={() => router.push('/booking-issue')}>
                        <Text style={styles.optionText}>Booking issues</Text>
                        <Ionicons name="chevron-forward" size={22} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Contact Support Card */}
                <TouchableOpacity style={styles.supportCard} activeOpacity={0.8} onPress={() => router.push('/support-chat')}>
                    <View style={styles.supportIcon}>
                        <Ionicons name="headset" size={24} color={ACCENT} />
                    </View>
                    <Text style={styles.supportText}>
                        Contact support for assistance or to share your feedback.
                    </Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    closeCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
    },
    divider: {
        height: 1,
        backgroundColor: '#e8e8e8',
    },
    scrollContent: {
        padding: 20,
    },
    // Options card
    optionsCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 18,
        paddingHorizontal: 18,
        marginBottom: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    optionDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
    },
    // Support card
    supportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3EC',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 18,
        gap: 14,
        borderWidth: 1,
        borderColor: '#FFD0B0',
    },
    supportIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFD0B0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    supportText: {
        flex: 1,
        fontSize: 13,
        color: ACCENT,
        lineHeight: 19,
        fontWeight: '600',
    },
});
