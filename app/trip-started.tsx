import React, { useRef, useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const ACCENT = '#FF5F00';



const NAVIGATE_REGION = {
    latitude: 15.472,
    longitude: 120.963,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

const SHEET_EXPANDED_HEIGHT = 420;
const SHEET_COLLAPSED_HEIGHT = 240;

export default function TripStartedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { emergencyContact } = useContext(AuthContext);
    const params = useLocalSearchParams<{
        name?: string;
        dropoff?: string;
        fare?: string;
        dropoffFull?: string;
        rideId?: string;
        dropoffLat?: string;
        dropoffLng?: string;
    }>();

    const passengerName = params.name || 'Passenger';
    const fare = params.fare || '70.00';
    const rideId = params.rideId;
    const dropoffFull = params.dropoffFull || 'Drop off location';
    const pickupFull = params.pickupFull || 'Pickup location';

    const dLat = params.dropoffLat ? parseFloat(params.dropoffLat) : 15.4748;
    const dLng = params.dropoffLng ? parseFloat(params.dropoffLng) : 120.9673;

    const DROPOFF_COORDS = {
        latitude: dLat,
        longitude: dLng,
    };

    const INITIAL_REGION = {
        latitude: dLat,
        longitude: dLng,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
    };

    const { socket, isConnected } = useContext(SocketContext);

    const mapRef = useRef<any>(null);
    const [driverLocation, setDriverLocation] = React.useState(INITIAL_REGION);

    // Listen for ride cancellation
    React.useEffect(() => {
        if (!socket || !isConnected || !rideId) return;

        socket.emit('join_ride', { rideId });

        socket.on('ride_cancelled', (data: any) => {
            Alert.alert('Ride Cancelled', data?.reason || 'The passenger has cancelled the ride.');
            router.replace('/(tabs)');
        });
        return () => {
            socket.off('ride_cancelled');
        };
    }, [socket, isConnected, rideId, router]);

    // Simulate driver movement and emit location updates
    React.useEffect(() => {
        if (!rideId || !socket || !isConnected) return;
        const interval = setInterval(() => {
            setDriverLocation(prev => {
                const newLoc = {
                    ...prev,
                    latitude: prev.latitude + 0.0001,
                    longitude: prev.longitude + 0.0001
                };
                socket.emit('driver_location_update', { rideId, location: newLoc });
                return newLoc;
            });
        }, 5000); // update every 5 seconds
        return () => clearInterval(interval);
    }, [rideId, socket, isConnected]);

    const sheetHeight = useSharedValue(SHEET_EXPANDED_HEIGHT);
    const dragStart = useSharedValue(0);

    const snapToExpanded = () => {
        sheetHeight.value = withSpring(SHEET_EXPANDED_HEIGHT, { damping: 20, stiffness: 200 });
    };

    const snapToCollapsed = () => {
        sheetHeight.value = withSpring(SHEET_COLLAPSED_HEIGHT, { damping: 20, stiffness: 200 });
        mapRef.current?.animateToRegion(NAVIGATE_REGION, 500);
    };

    const onGestureEvent = (event: any) => {
        'worklet';
        const newHeight = dragStart.value - event.nativeEvent.translationY;
        sheetHeight.value = Math.max(
            SHEET_COLLAPSED_HEIGHT,
            Math.min(SHEET_EXPANDED_HEIGHT, newHeight)
        );
    };

    const onGestureEnd = (event: any) => {
        'worklet';
        const velocity = event.nativeEvent.velocityY;
        const currentHeight = sheetHeight.value;
        const midPoint = (SHEET_EXPANDED_HEIGHT + SHEET_COLLAPSED_HEIGHT) / 2;

        if (velocity > 500 || currentHeight < midPoint) {
            runOnJS(snapToCollapsed)();
        } else {
            runOnJS(snapToExpanded)();
        }
    };

    const onGestureBegan = () => {
        'worklet';
        dragStart.value = sheetHeight.value;
    };

    const animatedSheetStyle = useAnimatedStyle(() => ({
        height: sheetHeight.value,
    }));

    const animatedContentStyle = useAnimatedStyle(() => ({
        opacity:
            (sheetHeight.value - SHEET_COLLAPSED_HEIGHT) /
            (SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT),
    }));

    const triggerEmergencyAlert = async () => {
        if (!emergencyContact) {
            Alert.alert(
                'No Emergency Contact Set',
                'Please set up an emergency contact in your Profile page under "One Tap Emergency".',
                [{ text: 'OK' }]
            );
            return;
        }

        if (!emergencyContact.mobileNumber) {
            Alert.alert(
                'Incomplete Contact details',
                'Please set up an emergency contact mobile number in your Profile page.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Trigger Emergency',
            `Send emergency text message to ${emergencyContact.firstName} ${emergencyContact.lastName} (${emergencyContact.mobileNumber})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SMS',
                    onPress: () => {
                        const msg = `EMERGENCY: I am a FINDER driver on an active trip. Please contact or track me. (Trip Destination: ${dropoffFull})`;
                        const separator = Platform.OS === 'ios' ? '&' : '?';
                        const url = `sms:${emergencyContact.mobileNumber}${separator}body=${encodeURIComponent(msg)}`;
                        Linking.openURL(url).catch(err => {
                            console.error(err);
                            Alert.alert('Error', 'Could not open SMS application.');
                        });
                    }
                }
            ]
        );
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={INITIAL_REGION}
                showsUserLocation
                showsMyLocationButton={false}
            >
                <Marker coordinate={DROPOFF_COORDS} title="Drop off Location" />
                <Marker coordinate={driverLocation} title="You" tracksViewChanges={false}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#007AFF', borderWidth: 2, borderColor: '#FFF' }} />
                </Marker>
            </MapView>

            {/* Floating One Tap Emergency Button */}
            <TouchableOpacity
                style={[styles.emergencyFloatingBtn, { top: insets.top + 16 }]}
                onPress={triggerEmergencyAlert}
                activeOpacity={0.85}
            >
                <Ionicons name="alert-circle" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emergencyFloatingTxt}>Emergency</Text>
            </TouchableOpacity>

            {/* BOTTOM SHEET */}
            <Animated.View style={[styles.bottomSheet, animatedSheetStyle]}>
                <SafeAreaView edges={['bottom']} style={styles.sheetSafeContainer}>
                    {/* Draggable Handle */}
                    <PanGestureHandler
                        onGestureEvent={onGestureEvent}
                        onHandlerStateChange={(e) => {
                            if (e.nativeEvent.state === 2) onGestureBegan();
                            if (e.nativeEvent.state === 5) onGestureEnd(e);
                        }}
                    >
                        <Animated.View style={styles.handleArea}>
                            <View style={styles.handle} />
                        </Animated.View>
                    </PanGestureHandler>

                    {/* Passenger name — always visible */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Passenger</Text>
                        <Text style={styles.value}>{passengerName}</Text>
                    </View>

                    {/* Title and divider — always visible below name */}
                    <Text style={styles.sheetTitle}>Trip started</Text>
                    <View style={styles.divider} />

                    {/* Expandable: Drop off + Fare */}
                    <Animated.View style={[styles.expandableContent, animatedContentStyle]}>
                        {/* Drop off location */}
                        <View style={styles.locationBlock}>
                            <View style={styles.locationRow}>
                                <View style={styles.dotOutline} />
                                <Text style={styles.locationTitle}>Drop off location</Text>
                            </View>
                            <Text style={styles.locationAddress}>{dropoffFull}</Text>
                        </View>

                        {/* Total Fare */}
                        <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>Total Fare</Text>
                            <Text style={styles.fareValue}>₱ {fare}</Text>
                        </View>
                    </Animated.View>

                    <View style={styles.divider} />

                    {/* Navigate — single centered button */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={snapToCollapsed}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="navigate-outline" size={22} color={ACCENT} />
                            <Text style={[styles.actionText, { color: ACCENT }]}>Navigate</Text>
                        </TouchableOpacity>
                    </View>

                    {/* DROP OFF button */}
                    <TouchableOpacity
                        style={styles.dropOffBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push({
                                pathname: '/drop-off',
                                params: {
                                    rideId,
                                    name: passengerName,
                                    fare: fare,
                                    dropoffFull: dropoffFull,
                                    dropoffLat: dLat,
                                    dropoffLng: dLng,
                                    pickupFull: pickupFull,
                                    duration: '7 minutes',
                                    distance: '3.6 Km',
                                },
                            })
                        }
                    >
                        <Text style={styles.dropOffText}>DROP OFF</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Animated.View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eee',
    },
    mapPlaceholder: {
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mapPlaceholderText: {
        color: '#555',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    sheetSafeContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    handleArea: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 0,
    },
    divider: {
        height: 1,
        backgroundColor: '#ebebeb',
        marginVertical: 10,
    },
    row: {
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 1,
    },
    value: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
    },
    expandableContent: {
        overflow: 'hidden',
    },
    locationBlock: {
        marginBottom: 10,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    dotOutline: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#fff',
        borderWidth: 2.5,
        borderColor: ACCENT,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: ACCENT,
    },
    locationAddress: {
        fontSize: 12.5,
        color: '#666',
        lineHeight: 19,
        paddingLeft: 22,
    },
    fareRow: {
        marginBottom: 4,
    },
    fareLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    fareValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#222',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 28,
    },
    actionText: {
        fontSize: 12,
        color: '#555',
        fontWeight: '500',
    },
    dropOffBtn: {
        borderWidth: 1.5,
        borderColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    dropOffText: {
        color: ACCENT,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1,
    },
    emergencyFloatingBtn: {
        position: 'absolute',
        right: 16,
        zIndex: 20,
        backgroundColor: '#E53E3E',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        shadowColor: '#E53E3E',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    emergencyFloatingTxt: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
