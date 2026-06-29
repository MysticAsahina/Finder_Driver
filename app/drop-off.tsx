import React, { useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { SocketContext } from '@/context/SocketContext';
import * as Location from 'expo-location';
import api from '@/utils/axios';

const ACCENT = '#FF5F00';

export default function DropOffScreen() {
    const router = useRouter();
    const { accessToken } = useContext(AuthContext);
    const { socket, isConnected } = useContext(SocketContext);
    const params = useLocalSearchParams<{
        rideId?: string;
        name?: string;
        fare?: string;
        pickupFull?: string;
        dropoffFull?: string;
        duration?: string;
        distance?: string;
    }>();

    const rideId = params.rideId;
    const passengerName = params.name || 'Passenger';
    const BOOKING_REF = rideId ? `Trip - ${rideId.slice(-6).toUpperCase()}` : 'Trip - 000000';
    const fare = params.fare || '70.00';
    const duration = params.duration || '7 minutes';
    const distance = params.distance || '3.6 Km';
    const pickupFull =
        params.pickupFull ||
        'SM City Cabanatuan\nBarangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';
    const dropoffFull =
        params.dropoffFull ||
        'Freedom Park, Barangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';

    React.useEffect(() => {
        if (!socket || !isConnected || !rideId) return;

        socket.emit('join_ride', { rideId });

        socket.on('ride_status_update', (data: any) => {
            if (data?.status === 'completed') {
                router.replace('/(tabs)');
            }
        });
        return () => {
            socket.off('ride_status_update');
        };
    }, [socket, isConnected, rideId, router]);

    const handleConfirmDropOff = async () => {
        if (!rideId) {
            router.replace('/(tabs)');
            return;
        }

        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            await api.patch(`/driver/ride/${rideId}/status`, {
                status: 'completed',
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });

            router.replace('/(tabs)');
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 400 && err.response?.data?.code === 'GPS_TOO_FAR') {
                Alert.alert('Too Far', err.response.data.message);
            } else if (err.response?.data?.message) {
                Alert.alert('Error', err.response.data.message);
            } else {
                Alert.alert('Error', 'Network error.');
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Drop off</Text>
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
                    <Text style={styles.fareValue}>₱ {fare}</Text>
                </View>

                <View style={styles.divider} />

                {/* Trip Info Table */}
                <View style={styles.infoTable}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Booking Reference ID</Text>
                        <Text style={styles.infoValue}>{BOOKING_REF}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>{duration}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Distance</Text>
                        <Text style={styles.infoValue}>{distance}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Trip fare</Text>
                        <Text style={styles.infoValue}>₱  {fare}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Pick up location */}
                <View style={styles.locationBlock}>
                    <View style={styles.locationRow}>
                        <View style={styles.dotFilled} />
                        <Text style={styles.locationTitle}>Pick up location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{pickupFull}</Text>
                </View>

                {/* Drop off location */}
                <View style={styles.locationBlock}>
                    <View style={styles.locationRow}>
                        <View style={styles.dotOutline} />
                        <Text style={styles.locationTitle}>Drop off location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{dropoffFull}</Text>
                </View>

                {/* Confirm Drop off button */}
                <TouchableOpacity
                    style={styles.confirmBtn}
                    activeOpacity={0.85}
                    onPress={handleConfirmDropOff}
                >
                    <Text style={styles.confirmText}>Confirm Drop off</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    // Sections
    section: {
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 3,
    },
    sectionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
    },
    fareValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#222',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
    // Info table
    infoTable: {
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 13,
        color: '#888',
    },
    infoValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
        textAlign: 'right',
    },
    // Locations
    locationBlock: {
        marginBottom: 20,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    dotFilled: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: ACCENT,
    },
    dotOutline: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 2.5,
        borderColor: ACCENT,
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
    // Confirm button
    confirmBtn: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    confirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
