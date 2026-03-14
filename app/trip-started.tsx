import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

const ACCENT = '#FF5F00';

// Drop off location — Freedom Park, Cabanatuan
const DROPOFF_COORDS = {
    latitude: 15.4748,
    longitude: 120.9673,
};

const INITIAL_REGION = {
    latitude: 15.4800,
    longitude: 120.9640,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
};

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
    const params = useLocalSearchParams<{
        name?: string;
        dropoff?: string;
        fare?: string;
        dropoffFull?: string;
    }>();

    const passengerName = params.name || 'Justine Kyle Castro';
    const fare = params.fare || '70.00';
    const dropoffFull =
        params.dropoffFull ||
        'Freedom Park, Barangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija';

    const mapRef = useRef<MapView>(null);

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

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* MAP — full screen */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_DEFAULT}
                initialRegion={INITIAL_REGION}
                showsUserLocation
                showsMyLocationButton={false}
            >
                <Marker coordinate={DROPOFF_COORDS} pinColor={ACCENT} />
            </MapView>

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
                                    name: passengerName,
                                    fare: fare,
                                    dropoffFull: dropoffFull,
                                    pickupFull: 'SM City Cabanatuan\nBarangay H Concepcion, Along Maharlika Hwy, Cabanatuan City, 3100 Nueva Ecija',
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
});
