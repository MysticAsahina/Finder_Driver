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

const DARK_GREEN = '#1a4a3a';

const FAQ_ITEMS = [
    {
        question: 'How do I receive booking requests?',
        answer:
            'Booking requests will appear in the Requests tab when you are marked as available.',
    },
    {
        question: 'How do I accept or decline a booking?',
        answer:
            'Tap Accept to take the booking or Decline if you are unavailable.',
    },
    {
        question: 'How do I start a trip?',
        answer:
            'Once you arrive at the pickup location, tap Start Trip to begin the ride.',
    },
    {
        question: 'How do I end a trip?',
        answer:
            'After reaching the destination, tap End Trip to complete the ride.',
    },
    {
        question: 'How do I view my completed trips?',
        answer:
            'All finished trips can be viewed in the Completed section under Activity.',
    },
    {
        question: 'Where can I see my earnings?',
        answer:
            'Trip earnings are shown in the trip details after completion and in your activity records.',
    },
    {
        question: 'How do I update my profile or vehicle information?',
        answer:
            'Go to the User section to view your profile details. Some information may require admin approval to update.',
    },
    {
        question: 'What should I do if I need to stop accepting bookings?',
        answer:
            'You can set your status to unavailable to temporarily stop receiving booking requests.',
    },
    {
        question: 'I forgot my password or MPIN. What should I do?',
        answer:
            'Use the Forgot Password option on the login screen or reset your MPIN through account settings.',
    },
];

export default function FaqsScreen() {
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
                <Text style={styles.headerTitle}>FAQs</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {FAQ_ITEMS.map((item, index) => (
                        <View key={index}>
                            <TouchableOpacity
                                style={styles.itemRow}
                                onPress={() => toggleItem(index)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.itemQuestion}>
                                    {index + 1}. {item.question}
                                </Text>
                                <Ionicons
                                    name={expanded.includes(index) ? 'checkmark' : 'chevron-forward'}
                                    size={20}
                                    color={DARK_GREEN}
                                />
                            </TouchableOpacity>
                            {expanded.includes(index) && (
                                <Text style={styles.itemAnswer}>{item.answer}</Text>
                            )}
                            {index < FAQ_ITEMS.length - 1 && <View style={styles.divider} />}
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
        backgroundColor: DARK_GREEN,
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
        color: DARK_GREEN,
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
    itemQuestion: {
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
