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
import { useRouter, useLocalSearchParams } from 'expo-router';

const DARK_GREEN = '#1a4a3a';

export default function TripDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        name?: string;
        pickup?: string;
        dropoff?: string;
        fare?: string;
        pickupFull?: string;
        dropoffFull?: string;
    }>();

    const passengerName = params.name || 'Justine Kyle Castro';
    const fare = params.fare || '70.00';
    const pickup = params.pickup || 'SM City Cabanatuan';
    const dropoff = params.dropoff || 'Freedom Park, Padre Burgos, Cabanatuan City';
    const pickupFull =
        params.pickupFull ||
        'SM City Cabanatuan\nBarangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';
    const dropoffFull =
        params.dropoffFull ||
        'Freedom Park, Barangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color={DARK_GREEN} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Passenger */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Passenger</Text>
                    <Text style={styles.sectionValue}>{passengerName}</Text>
                </View>

                {/* Total Fare */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Total Fare</Text>
                    <Text style={styles.sectionValue}>₱ {fare}</Text>
                </View>

                <View style={styles.divider} />

                {/* Actions: Chat & Cancel */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        activeOpacity={0.7}
                        onPress={() =>
                            router.push({
                                pathname: '/passenger-chat',
                                params: { name: passengerName },
                            })
                        }
                    >
                        <Ionicons name="chatbubble-outline" size={24} color="#666" />
                        <Text style={styles.actionText}>Chat</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                        <Ionicons name="close" size={26} color="#666" />
                        <Text style={styles.actionText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Pick up location */}
                <View style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                        <View style={styles.dotFilled} />
                        <Text style={styles.locationTitle}>Pick up location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{pickupFull}</Text>
                </View>

                {/* Drop off location */}
                <View style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                        <View style={styles.dotOutline} />
                        <Text style={styles.locationTitle}>Drop off location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{dropoffFull}</Text>
                </View>

                {/* Accept Button */}
                <TouchableOpacity
                    style={styles.acceptBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                        router.push({
                            pathname: '/pickup-passenger',
                            params: {
                                name: passengerName,
                                pickup: pickup,
                                dropoff: dropoff,
                                fare: fare,
                                pickupFull: pickupFull,
                            },
                        })
                    }
                >
                    <Text style={styles.acceptText}>ACCEPT</Text>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_GREEN,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    // Section
    section: {
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 2,
    },
    sectionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 14,
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
        paddingVertical: 8,
    },
    actionBtn: {
        alignItems: 'center',
        flex: 1,
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    actionDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e0e0e0',
    },
    // Location
    locationCard: {
        marginBottom: 22,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    dotFilled: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: DARK_GREEN,
        borderWidth: 3,
        borderColor: DARK_GREEN,
    },
    dotOutline: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 2.5,
        borderColor: DARK_GREEN,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
    },
    locationAddress: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
        paddingLeft: 26,
    },
    // Accept
    acceptBtn: {
        backgroundColor: '#2196F3',
        borderRadius: 50,
        paddingVertical: 14,
        alignItems: 'center',
        alignSelf: 'center',
        width: '55%',
        marginTop: 16,
    },
    acceptText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
