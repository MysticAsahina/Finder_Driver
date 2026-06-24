import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
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

const ACCENT = '#FF5F00';

// SM City Cabanatuan coordinates
const PICKUP_COORDS = {
    latitude: 15.4865,
    longitude: 120.9601,
};

const INITIAL_REGION = {
    latitude: 15.4865,
    longitude: 120.9601,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

const NAVIGATE_REGION = {
    latitude: 15.475,
    longitude: 120.958,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
};

// Sheet height constants
const SHEET_EXPANDED_HEIGHT = 460;
const SHEET_COLLAPSED_HEIGHT = 260;

export default function PickupPassengerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
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
    const pickupFull =
        params.pickupFull ||
        'SM City Cabanatuan\nBarangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';

    const mapRef = useRef<any>(null);
    const [arrived, setArrived] = useState(false);

    // Animated sheet height
    const sheetHeight = useSharedValue(SHEET_EXPANDED_HEIGHT);
    const isExpanded = useSharedValue(true);
    const dragStart = useSharedValue(0);

    const snapToExpanded = () => {
        sheetHeight.value = withSpring(SHEET_EXPANDED_HEIGHT, { damping: 20, stiffness: 200 });
        isExpanded.value = true;
    };

    const snapToCollapsed = () => {
        sheetHeight.value = withSpring(SHEET_COLLAPSED_HEIGHT, { damping: 20, stiffness: 200 });
        isExpanded.value = false;
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
            // Snap down
            runOnJS(snapToCollapsed)();
        } else {
            // Snap up
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
        opacity: (sheetHeight.value - SHEET_COLLAPSED_HEIGHT) / (SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT),
    }));

    const handleNavigate = () => {
        snapToCollapsed();
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
                <Marker coordinate={PICKUP_COORDS} title="Pickup Location" />
            </MapView>

            {/* BOTTOM SHEET */}
            <Animated.View style={[styles.bottomSheet, animatedSheetStyle]}>
                <SafeAreaView edges={['bottom']} style={styles.sheetSafeContainer}>
                    {/* Draggable Handle */}
                    <PanGestureHandler
                        onGestureEvent={onGestureEvent}
                        onHandlerStateChange={(e) => {
                            if (e.nativeEvent.state === 2) onGestureBegan(); // BEGAN
                            if (e.nativeEvent.state === 5) onGestureEnd(e); // END
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
                    <Text style={styles.sheetTitle}>Pick up passenger</Text>
                    <View style={styles.divider} />

                    {/* Expandable content — fades in/out */}
                    <Animated.View style={[styles.expandableContent, animatedContentStyle]}>

                        {/* Pick up location */}
                        <View style={styles.locationBlock}>
                            <View style={styles.locationRow}>
                                <View style={styles.dotFilled} />
                                <Text style={styles.locationTitle}>Pick up location</Text>
                            </View>
                            <Text style={styles.locationAddress}>{pickupFull}</Text>
                        </View>

                        {/* Total Fare */}
                        <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>Total Fare</Text>
                            <Text style={styles.fareValue}>₱ {fare}</Text>
                        </View>
                    </Animated.View>

                    <View style={styles.divider} />

                    {/* Actions row — always visible */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                router.push({ pathname: '/passenger-chat', params: { name: passengerName } })
                            }
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chatbubble-outline" size={22} color="#555" />
                            <Text style={styles.actionText}>Chat</Text>
                        </TouchableOpacity>

                        {!arrived && (
                            <>
                                <View style={styles.actionDivider} />
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={handleNavigate}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="navigate-outline" size={22} color={ACCENT} />
                                    <Text style={[styles.actionText, { color: ACCENT }]}>Navigate</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={24} color="#555" />
                            <Text style={styles.actionText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ARRIVED / PICK UP button */}
                    <TouchableOpacity
                        style={arrived ? styles.pickupBtn : styles.arrivedBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                            if (!arrived) {
                                setArrived(true);
                                snapToExpanded();
                            } else {
                                router.push({
                                    pathname: '/trip-started',
                                    params: {
                                        name: passengerName,
                                        fare: fare,
                                        dropoffFull: params.dropoffFull ||
                                            'Freedom Park, Barangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija',
                                    },
                                });
                            }
                        }}
                    >
                        <Text style={arrived ? styles.pickupText : styles.arrivedText}>
                            {arrived ? 'PICK UP' : 'ARRIVED'}
                        </Text>
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
    sheetTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#444',
        marginTop: 4,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#ebebeb',
        marginVertical: 10,
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
    dotFilled: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: ACCENT,
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
        paddingVertical: 4,
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
    },
    actionText: {
        fontSize: 12,
        color: '#555',
        fontWeight: '500',
    },
    actionDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#ebebeb',
    },
    arrivedBtn: {
        borderWidth: 1.5,
        borderColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    arrivedText: {
        color: ACCENT,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1,
    },
    pickupBtn: {
        backgroundColor: ACCENT,
        borderRadius: 50,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    pickupText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
