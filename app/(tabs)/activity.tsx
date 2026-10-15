import React, { useState, useCallback, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import api from '@/utils/axios';

const ACCENT = Colors.light.tint;

type TabKey = 'requests' | 'completed' | 'cancelled';

interface TripInfo {
    id: string;
    name: string;
    pickup: string;
    dropoff: string;
    date: string;
    rawDate: string;
    fare?: number;
    refId: string;
    duration: string;
    distance: string;
    status: string;
    cancelReason?: string;
    passengerId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).replace(' at ', ', '); 
}

function generateRefId(id: string) {
    return `Trip - ${id.substring(id.length - 6).toUpperCase()}`;
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚕</Text>
            <Text style={styles.emptyText}>No {label} trips</Text>
        </View>
    );
}

export default function ActivityScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('requests');
    const [selectedTrip, setSelectedTrip] = useState<TripInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingReport, setCreatingReport] = useState(false);

    const [currentTrip, setCurrentTrip] = useState<TripInfo | null>(null);
    const [completedTrips, setCompletedTrips] = useState<TripInfo[]>([]);
    const [cancelledTrips, setCancelledTrips] = useState<TripInfo[]>([]);

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'requests', label: 'Active Ride' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    const { user } = useContext(AuthContext);
    const [reportingTrip, setReportingTrip] = useState<TripInfo | null>(null);
    const [selectedReason, setSelectedReason] = useState<string>('');

    const DRIVER_COMPLETED_REASONS = [
        'Underpayment / Fare Evasion',
        'Unruly / Disrespectful Conduct',
        'Vehicle Damage / Soiling',
        'Demanded Hazardous / Prohibited Route',
    ];

    const DRIVER_CANCELLED_REASONS = [
        'Passenger No-Show',
        'Inaccessible / Wrong Pickup Location',
        'Passenger Unresponsive',
        'Last-Minute Cancellation after Travel',
    ];

    const mapRideToTrip = (r: any): TripInfo => {
        const passenger = r.passengerId;
        const passengerName = passenger ? `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim() : 'Passenger';
        return {
            id: r._id,
            name: passengerName || 'Passenger',
            pickup: r.pickup?.address || 'Unknown pickup',
            dropoff: r.dropoff?.address || 'Unknown dropoff',
            date: formatDate(r.createdAt),
            rawDate: r.tripCompletedAt || r.createdAt,
            fare: r.fare,
            refId: generateRefId(r._id),
            duration: r.actualDurationMins ? `${Math.round(r.actualDurationMins * 10) / 10} minutes` : (r.durationMins ? `${Math.round(r.durationMins * 10) / 10} minutes` : '–'),
            distance: r.distanceKm ? `${r.distanceKm.toFixed(1)} Km` : '–',
            status: r.status || 'unknown',
            cancelReason: r.cancellationData?.reason || '',
            passengerId: passenger?._id || (typeof passenger === 'string' ? passenger : undefined),
        };
    };

    const handleReport = (trip: TripInfo) => {
        setSelectedTrip(null);
        setSelectedReason('');
        setReportingTrip(trip);
    };

    const submitReport = async () => {
        const { Alert } = require('react-native');
        if (!reportingTrip || !selectedReason) {
            Alert.alert("Please Select Reason", "Kindly select a reason for reporting this ride.");
            return;
        }
        if (creatingReport) return;

        setCreatingReport(true);
        try {
            // Create a new support ticket for the reported ride
            const res = await api.post('/support/tickets', { 
                subject: "Passenger Complaint",
                category: "Passenger Complaint",
                rideId: reportingTrip.id 
            });

            const newTicket = res.data?.ticket;
            if (newTicket?._id) {
                // Post report details as opening message in the new ticket
                await api.post(`/support/tickets/${newTicket._id}/messages`, {
                    body: `[Ride Report Issue: ${reportingTrip.refId}]\nReason: ${selectedReason}`
                }).catch(() => {});

                setReportingTrip(null);
                setSelectedReason('');
                router.push(`/support-chat?ticketId=${newTicket._id}`);
            } else {
                throw new Error(res.data?.message || "Failed to create support ticket.");
            }
        } catch (err: any) {
            Alert.alert("Report Failed", err.response?.data?.message || err.message || "Failed to submit report ticket.");
        } finally {
            setCreatingReport(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const fetchData = async () => {
                setLoading(true);
                try {
                    const [currentRes, historyRes] = await Promise.all([
                        api.get('/driver/ride/current').catch(() => null),
                        api.get('/driver/ride/history').catch(() => null)
                    ]);

                    if (!isActive) return;

                    if (currentRes?.data?.ride) {
                        setCurrentTrip(mapRideToTrip(currentRes.data.ride));
                    } else {
                        setCurrentTrip(null);
                    }

                    if (historyRes?.data?.rides) {
                        const rides: any[] = historyRes.data.rides;
                        setCompletedTrips(rides.filter(r => r.status === 'completed').map(mapRideToTrip));
                        setCancelledTrips(rides.filter(r => r.status === 'cancelled').map(mapRideToTrip));
                    }
                } catch (err) {
                    console.error("Error fetching driver history", err);
                } finally {
                    if (isActive) setLoading(false);
                }
            };

            fetchData();
            return () => { isActive = false; };
        }, [])
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                        <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'requests' && (
                        currentTrip ? <RequestsList item={currentTrip} /> : <EmptyState label="active" />
                    )}
                    {activeTab === 'completed' && (
                        completedTrips.length > 0 ? <CompletedList data={completedTrips} onSelect={setSelectedTrip} /> : <EmptyState label="completed" />
                    )}
                    {activeTab === 'cancelled' && (
                        cancelledTrips.length > 0 ? <CancelledList data={cancelledTrips} onSelect={setSelectedTrip} /> : <EmptyState label="cancelled" />
                    )}
                </ScrollView>
            )}

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
                                {([
                                    ['Passenger', selectedTrip.name],
                                    ['Booking Reference ID', selectedTrip.refId],
                                    selectedTrip.status !== 'cancelled' ? ['Duration', selectedTrip.duration] : null,
                                    ['Distance', selectedTrip.distance],
                                    ['Trip fare', selectedTrip.fare ? `₱ ${selectedTrip.fare.toFixed(2)}` : '—'],
                                    selectedTrip.status === 'cancelled' && selectedTrip.cancelReason ? ['Cancel Reason', selectedTrip.cancelReason] : null,
                                ].filter(Boolean) as [string, string][]).map(([k, v]) => (
                                    <View key={k} style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>{k}</Text>
                                        <Text style={styles.infoValue}>{v}</Text>
                                    </View>
                                ))}

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

                                {/* Report Button */}
                                {(Date.now() - new Date(selectedTrip.rawDate).getTime()) <= (7 * 24 * 60 * 60 * 1000) && (
                                    <TouchableOpacity style={styles.reportBtn} onPress={() => handleReport(selectedTrip)} activeOpacity={0.8}>
                                        <Text style={styles.reportBtnTxt}>Report Issue</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Driver Report Reason Modal */}
            <Modal
                visible={reportingTrip !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!creatingReport) setReportingTrip(null);
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        if (!creatingReport) setReportingTrip(null);
                    }}
                >
                    <TouchableOpacity
                        style={styles.reportModalCard}
                        activeOpacity={1}
                        onPress={() => {}}
                    >
                        <View style={styles.reportModalHeader}>
                            <Text style={styles.reportModalTitle}>Report Passenger Issue</Text>
                            <Text style={styles.reportModalSubtitle}>
                                Select the reason why you are reporting {reportingTrip?.refId} ({reportingTrip?.status === 'cancelled' || reportingTrip?.status === 'canceled' ? 'Cancelled Ride' : 'Completed Ride'}):
                            </Text>
                        </View>

                        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                            {(reportingTrip?.status === 'cancelled' || reportingTrip?.status === 'canceled'
                                ? DRIVER_CANCELLED_REASONS
                                : DRIVER_COMPLETED_REASONS
                            ).map((reason) => {
                                const isChosen = selectedReason === reason;
                                return (
                                    <TouchableOpacity
                                        key={reason}
                                        style={[styles.reasonOption, isChosen && styles.reasonOptionSelected]}
                                        activeOpacity={0.7}
                                        onPress={() => setSelectedReason(reason)}
                                    >
                                        <View style={[styles.reasonRadio, isChosen && styles.reasonRadioSelected]}>
                                            {isChosen && <View style={styles.reasonRadioInner} />}
                                        </View>
                                        <Text style={[styles.reasonText, isChosen && styles.reasonTextSelected]}>
                                            {reason}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.reportActions}>
                            <TouchableOpacity
                                style={styles.reportCancelBtn}
                                activeOpacity={0.7}
                                disabled={creatingReport}
                                onPress={() => setReportingTrip(null)}
                            >
                                <Text style={styles.reportCancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.reportSubmitBtn, (!selectedReason || creatingReport) && { opacity: 0.55 }]}
                                activeOpacity={0.8}
                                disabled={!selectedReason || creatingReport}
                                onPress={submitReport}
                            >
                                {creatingReport ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.reportSubmitBtnTxt}>Submit Report</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

/* ── Requests Tab ── */
function RequestsList({ item }: { item: TripInfo }) {
    const router = useRouter();
    return (
        <View style={styles.card}>
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
            <Text style={styles.fare}>₱ {item.fare?.toFixed(2)}</Text>
            {/* The actual routing might depend on if the driver has picked up yet, but we'll use a generic trip-details link if needed, or route back to index */}
            <TouchableOpacity
                style={styles.viewDetailsBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)')}
            >
                <Text style={styles.viewDetailsText}>View on Map</Text>
            </TouchableOpacity>
        </View>
    );
}

/* ── Completed Tab ── */
function CompletedList({ data, onSelect }: { data: TripInfo[], onSelect: (trip: TripInfo) => void }) {
    return (
        <View>
            {data.map((item) => (
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
function CancelledList({ data, onSelect }: { data: TripInfo[], onSelect: (trip: TripInfo) => void }) {
    return (
        <View>
            {data.map((item) => (
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
    reportBtn: {
        marginTop: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ff4444',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    reportBtnTxt: {
        color: '#ff4444',
        fontWeight: '700',
        fontSize: 14,
    },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 36, marginBottom: 10 },
    emptyText: { fontSize: 15, color: '#aaa', fontWeight: '500' },

    reportModalCard: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
    },
    reportModalHeader: {
        marginBottom: 14,
    },
    reportModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    reportModalSubtitle: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#f8faf8',
        borderWidth: 1,
        borderColor: '#e2eae2',
        marginBottom: 8,
    },
    reasonOptionSelected: {
        backgroundColor: '#f0fdf4',
        borderColor: ACCENT,
    },
    reasonRadio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#bbb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    reasonRadioSelected: {
        borderColor: ACCENT,
    },
    reasonRadioInner: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: ACCENT,
    },
    reasonText: {
        fontSize: 13.5,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    reasonTextSelected: {
        color: ACCENT,
        fontWeight: '700',
    },
    reportActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 12,
    },
    reportCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    reportCancelBtnTxt: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    reportSubmitBtn: {
        flex: 1.4,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff4444',
    },
    reportSubmitBtnTxt: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
