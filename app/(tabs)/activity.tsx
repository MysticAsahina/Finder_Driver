import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;

type TabKey = 'requests' | 'completed' | 'cancelled';

interface TripInfo {
    id: string;
    pickup: string;
    dropoff: string;
    date: string;
    fare?: number;
    refId: string;
    duration: string;
    distance: string;
}

// Sample data
const requestsData = [
    {
        id: '1',
        name: 'Justine Kyle Castro',
        pickup: 'SM City Cabanatuan',
        dropoff: 'Freedom Park, Padre Burgos, Cabanatuan City',
        fare: 70.0,
    },
];

const completedData: TripInfo[] = [
    {
        id: '1',
        pickup: 'SM City Cabanatuan',
        dropoff: 'Freedom Park, Padre Burgos, Cabanatuan City',
        date: 'Sun, 15, Feb, 6:54 PM',
        fare: 70.0,
        refId: 'Trip - 8F07A3',
        duration: '7 minutes',
        distance: '3.6 Km',
    },
];

const cancelledData: TripInfo[] = [
    {
        id: '1',
        pickup: 'SM City Cabanatuan',
        dropoff: 'Freedom Park, Padre Burgos, Cabanatuan City',
        date: 'Sun, 15, Feb, 4:23 PM',
        refId: 'Trip - 4B12C9',
        duration: '—',
        distance: '—',
    },
];

export default function ActivityScreen() {
    const [activeTab, setActiveTab] = useState<TabKey>('requests');
    const [selectedTrip, setSelectedTrip] = useState<TripInfo | null>(null);

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'requests', label: 'Requests' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Title */}
            <Text style={styles.title}>Activity</Text>

            {/* Tabs */}
            <View style={styles.tabRow}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                        onPress={() => setActiveTab(tab.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab.key && styles.activeTabText,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'requests' && <RequestsList />}
                {activeTab === 'completed' && (
                    <CompletedList onSelect={setSelectedTrip} />
                )}
                {activeTab === 'cancelled' && (
                    <CancelledList onSelect={setSelectedTrip} />
                )}
            </ScrollView>

            {/* Trip Details Modal */}
            <Modal
                visible={selectedTrip !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedTrip(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedTrip(null)}
                >
                    <TouchableOpacity
                        style={styles.modalCard}
                        activeOpacity={1}
                        onPress={() => { }}
                    >
                        {selectedTrip && (
                            <>
                                {/* Header */}
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Trip Details</Text>
                                    <Text style={styles.modalDate}>{selectedTrip.date}</Text>
                                </View>

                                <View style={styles.modalDivider} />

                                {/* Info rows */}
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Booking Reference ID</Text>
                                    <Text style={styles.infoValue}>{selectedTrip.refId}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Duration</Text>
                                    <Text style={styles.infoValue}>{selectedTrip.duration}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Distance</Text>
                                    <Text style={styles.infoValue}>{selectedTrip.distance}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Trip fare</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedTrip.fare ? `₱ ${selectedTrip.fare.toFixed(2)}` : '—'}
                                    </Text>
                                </View>

                                <View style={styles.modalDivider} />

                                {/* Route */}
                                <View style={styles.modalRoute}>
                                    <View style={styles.dotLine}>
                                        <View style={styles.dotGreen} />
                                        <View style={styles.dottedLine} />
                                        <View style={styles.dotGreen} />
                                    </View>
                                    <View style={styles.routeTexts}>
                                        <Text style={styles.locationText}>{selectedTrip.pickup}</Text>
                                        <Text style={styles.locationText}>{selectedTrip.dropoff}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

/* ── Requests Tab ── */
function RequestsList() {
    const router = useRouter();
    return (
        <View>
            {requestsData.map((item) => (
                <View key={item.id} style={styles.card}>
                    <Text style={styles.passengerName}>{item.name}</Text>
                    <View style={styles.routeContainer}>
                        <View style={styles.dotLine}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dottedLine} />
                            <View style={styles.dotGreen} />
                        </View>
                        <View style={styles.routeTexts}>
                            <Text style={styles.locationText}>{item.pickup}</Text>
                            <Text style={styles.locationText}>{item.dropoff}</Text>
                        </View>
                    </View>
                    <Text style={styles.fare}>₱ {item.fare.toFixed(2)}</Text>
                    <TouchableOpacity
                        style={styles.viewDetailsBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push({
                                pathname: '/trip-details',
                                params: {
                                    name: item.name,
                                    pickup: item.pickup,
                                    dropoff: item.dropoff,
                                    fare: item.fare.toFixed(2),
                                },
                            })
                        }
                    >
                        <Text style={styles.viewDetailsText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

/* ── Completed Tab ── */
function CompletedList({ onSelect }: { onSelect: (trip: TripInfo) => void }) {
    return (
        <View>
            {completedData.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => onSelect(item)}
                >
                    <View style={styles.routeContainer}>
                        <View style={styles.dotLine}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dottedLine} />
                            <View style={styles.dotGreen} />
                        </View>
                        <View style={styles.routeTexts}>
                            <Text style={styles.locationText}>{item.pickup}</Text>
                            <Text style={styles.locationText}>{item.dropoff}</Text>
                        </View>
                    </View>
                    <View style={styles.completedFooter}>
                        <Text style={styles.dateText}>{item.date}</Text>
                        <Text style={styles.fareSmall}>₱   {item.fare?.toFixed(2)}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

/* ── Cancelled Tab ── */
function CancelledList({ onSelect }: { onSelect: (trip: TripInfo) => void }) {
    return (
        <View>
            {cancelledData.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => onSelect(item)}
                >
                    <View style={styles.routeContainer}>
                        <View style={styles.dotLine}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dottedLine} />
                            <View style={styles.dotGreen} />
                        </View>
                        <View style={styles.routeTexts}>
                            <Text style={styles.locationText}>{item.pickup}</Text>
                            <Text style={styles.locationText}>{item.dropoff}</Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{item.date}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: ACCENT,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    // Tabs
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1.5,
        borderBottomColor: '#e0e0e0',
        paddingHorizontal: 12,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: ACCENT,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#aaa',
    },
    activeTabText: {
        color: ACCENT,
        fontWeight: '700',
    },
    // Scroll
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Card
    card: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        backgroundColor: '#fff',
    },
    passengerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
        marginBottom: 12,
    },
    // Route
    routeContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    dotLine: {
        width: 18,
        alignItems: 'center',
        paddingTop: 5,
    },
    dotGreen: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: ACCENT,
    },
    dottedLine: {
        width: 2,
        height: 20,
        borderStyle: 'dotted',
        borderWidth: 1,
        borderColor: ACCENT,
        marginVertical: 2,
    },
    routeTexts: {
        flex: 1,
        justifyContent: 'space-between',
        paddingLeft: 6,
        gap: 14,
    },
    locationText: {
        fontSize: 13.5,
        color: '#333',
        fontWeight: '500',
        lineHeight: 18,
    },
    // Fare
    fare: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 14,
    },
    // View Details
    viewDetailsBtn: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 12,
        alignItems: 'center',
        alignSelf: 'center',
        width: '65%',
    },
    viewDetailsText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    // Completed footer
    completedFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12.5,
        color: '#999',
    },
    fareSmall: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '88%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#222',
    },
    modalDate: {
        fontSize: 12,
        color: ACCENT,
        fontWeight: '500',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 13,
        color: '#777',
    },
    infoValue: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#333',
    },
    modalRoute: {
        flexDirection: 'row',
        paddingTop: 4,
    },
});
