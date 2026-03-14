import React, { useState } from 'react';
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

const BOOKING_ISSUES = [
    {
        title: 'Passenger did not show up',
        answer:
            'Wait at the pickup location for a reasonable amount of time. If the passenger does not arrive, you may cancel the booking and report the issue if necessary.',
    },
    {
        title: 'Wrong pickup location',
        answer:
            'Contact the passenger through in-app messaging to confirm the correct pickup point.',
    },
    {
        title: 'Passenger requested cancellation',
        answer:
            'If the passenger requests cancellation, you may cancel the booking and wait for a new request.',
    },
    {
        title: 'Unable to start the trip',
        answer:
            'Ensure you are at the pickup location and that the booking is active. If the issue continues, contact support.',
    },
    {
        title: 'Trip ended incorrectly',
        answer:
            'If a trip ends unexpectedly or incorrectly, report the issue through support for review.',
    },
    {
        title: 'Fare concern',
        answer:
            'If there is a fare-related issue, submit a concern through the support section for verification.',
    },
    {
        title: 'App not responding during a trip',
        answer:
            'Restart the app if possible. If the issue affects the trip, report it to support immediately after.',
    },
];

export default function BookingIssueScreen() {
    const router = useRouter();
    const [expanded, setExpanded] = useState<number[]>([]);

    const toggleItem = (index: number) => {
        setExpanded((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <View style={styles.closeCircle}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Issue</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {BOOKING_ISSUES.map((item, index) => (
                        <View key={index}>
                            <TouchableOpacity
                                style={styles.itemRow}
                                onPress={() => toggleItem(index)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.itemTitle}>
                                    {index + 1}. {item.title}
                                </Text>
                                <Ionicons
                                    name={expanded.includes(index) ? 'checkmark' : 'chevron-forward'}
                                    size={20}
                                    color={ACCENT}
                                />
                            </TouchableOpacity>
                            {expanded.includes(index) && (
                                <Text style={styles.itemAnswer}>{item.answer}</Text>
                            )}
                            {index < BOOKING_ISSUES.length - 1 && (
                                <View style={styles.divider} />
                            )}
                        </View>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#f8f8f8',
        borderRadius: 18,
        paddingHorizontal: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        gap: 12,
    },
    itemTitle: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '600',
        color: '#333',
        lineHeight: 20,
    },
    itemAnswer: {
        fontSize: 12.5,
        color: '#666',
        lineHeight: 19,
        paddingBottom: 14,
        paddingLeft: 16,
        paddingRight: 8,
        textAlign: 'justify',
    },
    divider: {
        height: 1,
        backgroundColor: '#e4e4e4',
    },
});
