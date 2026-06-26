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

const MOCK_SUPPORT_LOGS = [
    {
        id: '1',
        title: 'Passenger Left Phone on Seat',
        status: 'Pending',
        adminReply: 'Admin: We are verifying the report. Please coordinate with the passenger Marcelino Zafra if they reach out.',
        refNo: '109384012',
        date: 'June 08, 2026',
    },
    {
        id: '2',
        title: 'App Location Accuracy Issue',
        status: 'Resolved',
        adminReply: 'Admin: Please make sure location accuracy is set to High and update your Google Play Services.',
        refNo: '208472910',
        date: 'June 07, 2026',
    },
    {
        id: '3',
        title: 'Fare Rate Discrepancy',
        status: 'Resolved',
        adminReply: 'Admin: The fare calculation has been adjusted to match TODA guidelines.',
        refNo: '304958102',
        date: 'June 04, 2026',
    },
];

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
                    <View style={{ flex: 1 }}>
                        <Text style={styles.supportText}>
                            Contact support for assistance or to share your feedback.
                        </Text>
                        <Text style={styles.supportTap}>Tap to chat with us →</Text>
                    </View>
                </TouchableOpacity>

                {/* Support Logs History */}
                <Text style={styles.historyTitle}>Support Logs</Text>
                <View style={styles.historyList}>
                    {MOCK_SUPPORT_LOGS.map(log => (
                        <TouchableOpacity
                            key={log.id}
                            style={styles.logCard}
                            activeOpacity={0.85}
                            onPress={() => router.push('/support-chat')}
                        >
                            <View style={styles.logHeader}>
                                <Text style={styles.logTitle}>{log.title}</Text>
                                <Text style={[styles.logStatus, log.status === 'Pending' ? styles.statusPending : styles.statusResolved]}>
                                    {log.status}
                                </Text>
                            </View>

                            <Text style={styles.logReply} numberOfLines={2}>
                                {log.adminReply}
                            </Text>

                            <View style={styles.logFooter}>
                                <Text style={styles.logDate}>Date: {log.date}</Text>
                                <Text style={styles.logRef}>Reference No. {log.refNo}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
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
        fontSize: 13,
        color: ACCENT,
        lineHeight: 19,
        fontWeight: '600',
    },
    supportTap: {
        fontSize: 11,
        color: ACCENT,
        marginTop: 4,
        opacity: 0.7,
    },
    // Support History Logs
    historyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        marginTop: 28,
        marginBottom: 12,
    },
    historyList: {
        width: '100%',
    },
    logCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    logTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 12,
    },
    logStatus: {
        fontSize: 14,
        fontWeight: '800',
    },
    statusPending: {
        color: '#ff4d4d',
    },
    statusResolved: {
        color: '#2e7d32',
    },
    logReply: {
        fontSize: 13,
        color: '#333333',
        lineHeight: 18,
        marginBottom: 12,
    },
    logFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    logDate: {
        fontSize: 12,
        color: '#888888',
    },
    logRef: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
    },
});
