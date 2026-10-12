import React, { useState, useContext, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '@/context/AuthContext';
import { getAppealToken } from '@/store/authStore';
import api from '@/utils/axios';

const ACCENT = '#FF5F00';

const CATEGORIES = [
    "Fare Dispute",
    "Lost Item",
    "Passenger Complaint",
    "App Issue",
    "Account & Profile",
    "General Support",
    "Other"
];

export default function HelpCentreScreen() {
    const router = useRouter();
    const { accessToken } = useContext(AuthContext);

    const [tickets, setTickets] = useState<any[]>([]);
    const [appeal, setAppeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchTickets = async () => {
        const appealToken = getAppealToken();
        if (appealToken) {
            try {
                const appealRes = await api.get('/appeals/my-appeal', {
                    headers: { Authorization: `Bearer ${appealToken}` }
                });
                if (appealRes.data.appeal) {
                    setAppeal(appealRes.data.appeal);
                }
            } catch (e) {
                // Ignore if not found
            }
        }

        if (!accessToken) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/support/tickets');
            const data = res.data;
            setTickets(data.tickets || []);
        } catch (err) {
            console.error("Failed to fetch tickets", err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTickets();
        }, [accessToken])
    );

    const allTickets = [...tickets];
    if (appeal && !allTickets.some(t => t.isAppeal || t._id === appeal._id)) {
        allTickets.unshift({
            _id: appeal._id,
            ticketNumber: appeal.ticketNumber,
            subject: `Suspension Appeal: ${appeal.reason || 'Account Review'}`,
            status: appeal.status === 'pending' ? 'open' : (appeal.status === 'lifted' ? 'resolved' : 'closed'),
            rawStatus: appeal.status,
            updatedAt: appeal.updatedAt || appeal.createdAt,
            createdAt: appeal.createdAt,
            isAppeal: true
        });
    }

    const handleSupportBannerPress = () => {
        if (!accessToken && appeal) {
            router.push({ pathname: '/support-chat', params: { ticketId: appeal._id, isAppeal: 'true' } });
            return;
        }
        setModalVisible(true);
    };

    const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    const handleSupportBannerPress = () => {
        if (!accessToken && appeal) {
            router.push({ pathname: '/support-chat', params: { ticketId: appeal._id, isAppeal: 'true' } });
            return;
        }
        setModalVisible(true);
    };

    const handleCreateTicket = async (category: string) => {
        if (creating || !accessToken) return;
        setCreating(true);

        try {
            const res = await api.post('/support/tickets', { subject: category });
            const data = res.data;

            if (data.ticket) {
                setModalVisible(false);
                router.push({ pathname: '/support-chat', params: { ticketId: data.ticket._id } });
            } else {
                Alert.alert("Error", data.message || "Could not create ticket");
            }
        } catch (err: any) {
            console.error("Failed to create ticket", err);
            Alert.alert("Error", err.response?.data?.message || "Could not connect to server");
        } finally {
            setCreating(false);
        }
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
                <TouchableOpacity style={styles.supportCard} activeOpacity={0.8} onPress={handleSupportBannerPress}>
                    <TouchableOpacity style={styles.supportCard} activeOpacity={0.8} onPress={handleSupportBannerPress}>
                        <View style={styles.supportIcon}>
                            <Ionicons name="headset" size={24} color={ACCENT} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.supportText}>
                                Contact support for assistance or to share your feedback.
                            </Text>
                            <Text style={styles.supportTap}>Tap to start a new chat →</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Active Appeal Banner / Section */}
                    {appeal && (
                        <View style={styles.appealSection}>
                            <View style={styles.appealHeaderRow}>
                                <Text style={styles.appealSectionTitle}>Suspension Appeal</Text>
                                <View style={[styles.appealStatusPill, appeal.status === 'pending' ? styles.statusPillPending : styles.statusPillResolved]}>
                                    <Text style={styles.appealStatusText}>
                                        {appeal.status === 'pending' ? 'Pending Review' : (appeal.status === 'lifted' ? 'Approved' : 'Rejected')}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.appealCard}
                                activeOpacity={0.85}
                                onPress={() => router.push({ pathname: '/support-chat', params: { ticketId: appeal._id, isAppeal: 'true' } })}
                            >
                                <View style={styles.appealCardTop}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={styles.appealTicketCode}>{appeal.ticketNumber}</Text>
                                        <Text style={styles.appealSubjectText} numberOfLines={2}>{appeal.reason}</Text>
                                    </View>
                                    <Ionicons name="shield-checkmark" size={26} color={ACCENT} />
                                </View>

                                <View style={styles.appealDivider} />

                                <View style={styles.appealFooterRow}>
                                    <Text style={styles.appealDateText}>
                                        Submitted: {new Date(appeal.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text style={styles.appealAttemptText}>
                                        Tap to open chat →
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Support Logs History */}
                    <Text style={styles.historyTitle}>Support Tickets</Text>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color={ACCENT} />
                    ) : allTickets.length === 0 ? (
                        <Text style={styles.emptyText}>You have no support tickets.</Text>
                    ) : (
                        <View style={styles.historyList}>
                            {allTickets.map(ticket => (
                                {
                                    allTickets.map(ticket => (
                                        <TouchableOpacity
                                            key={ticket._id}
                                            style={styles.logCard}
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                if (ticket.isAppeal) {
                                                    router.push({ pathname: '/support-chat', params: { ticketId: ticket._id, isAppeal: 'true' } });
                                                } else {
                                                    router.push({ pathname: '/support-chat', params: { ticketId: ticket._id } });
                                                }
                                            }}
                                            onPress={() => {
                                                if (ticket.isAppeal) {
                                                    router.push({ pathname: '/support-chat', params: { ticketId: ticket._id, isAppeal: 'true' } });
                                                } else {
                                                    router.push({ pathname: '/support-chat', params: { ticketId: ticket._id } });
                                                }
                                            }}
                                        >
                                            <View style={styles.logHeader}>
                                                <Text style={styles.logTitle}>{ticket.subject}</Text>
                                                <Text style={[styles.logStatus, (ticket.status === 'open' || ticket.rawStatus === 'pending') ? styles.statusPending : styles.statusResolved]}>
                                                    {ticket.rawStatus === 'pending'
                                                        ? 'Pending Review'
                                                        : ticket.rawStatus === 'lifted'
                                                            ? 'Approved'
                                                            : ticket.rawStatus === 'disabled'
                                                                ? 'Rejected'
                                                                : ticket.status === 'open'
                                                                    ? 'Open'
                                                                    : 'Resolved'}
                                                </Text>
                                            </View>

                                            <View style={styles.logFooter}>
                                                <Text style={styles.logDate}>
                                                    {new Date(ticket.updatedAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </Text>
                                                <Text style={styles.logRef}>Ticket #{ticket.ticketNumber || ticket._id.slice(-6).toUpperCase()}</Text>
                                                <Text style={styles.logRef}>Ticket #{ticket.ticketNumber || ticket._id.slice(-6).toUpperCase()}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                }
                    </View>
                    )}
            </ScrollView>

            {/* Category Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Support Ticket</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        {openTicketsCount >= 3 ? (
                            <View style={styles.modalErrorBox}>
                                <Text style={styles.modalErrorText}>
                                    You have reached the maximum of 3 open tickets. Please wait for an existing ticket to be resolved before creating a new one.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalSubtitle}>What do you need help with?</Text>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={styles.categoryBtn}
                                        onPress={() => handleCreateTicket(cat)}
                                        disabled={creating}
                                    >
                                        <Text style={styles.categoryBtnText}>{cat}</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#aaa" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {creating && (
                            <View style={styles.creatingOverlay}>
                                <ActivityIndicator color={ACCENT} size="large" />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
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
    emptyText: {
        color: '#888',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 20,
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
        marginBottom: 12,
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
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalCloseText: {
        color: '#666',
        fontSize: 14,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    categoryList: {
        paddingBottom: 20,
    },
    categoryBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    categoryBtnText: {
        fontSize: 15,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    modalErrorBox: {
        backgroundColor: '#FFF0F0',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFD6D6',
        marginBottom: 20,
    },
    modalErrorText: {
        color: '#D32F2F',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    creatingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    appealSection: {
        marginTop: 20,
        marginBottom: 8,
    },
    appealHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    appealSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    appealStatusPill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusPillPending: {
        backgroundColor: '#FFF3EC',
        borderWidth: 1,
        borderColor: '#FFD0B0',
    },
    statusPillResolved: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    appealStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: ACCENT,
    },
    appealCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FFD0B0',
        padding: 16,
        shadowColor: '#FF5F00',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    appealCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    appealTicketCode: {
        fontSize: 15,
        fontWeight: '800',
        color: ACCENT,
        marginBottom: 4,
    },
    appealSubjectText: {
        fontSize: 13.5,
        color: '#333',
        lineHeight: 18,
    },
    appealDivider: {
        height: 1,
        backgroundColor: '#f2f2f2',
        marginVertical: 12,
    },
    appealFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    appealDateText: {
        fontSize: 12,
        color: '#888',
    },
    appealAttemptText: {
        fontSize: 12,
        fontWeight: '600',
        color: ACCENT,
    },
});
