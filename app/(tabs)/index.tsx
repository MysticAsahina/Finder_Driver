import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import * as Location from 'expo-location';
import { AuthContext } from '@/context/AuthContext';
import { SocketContext } from '@/context/SocketContext';
import RequestModal from '@/components/RequestModal';
import api from '@/utils/axios';

const ACCENT = Colors.light.tint;
const ONLINE_GREEN = '#22c55e';

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const insets = useSafeAreaInsets();
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView>(null);
  
  const { accessToken } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const router = useRouter();

  // Timer for ride request
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (incomingRide && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIncomingRide(null);
    }
    return () => clearInterval(interval);
  }, [incomingRide, timeLeft]);

  // Listen to Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('ride_request', (data) => {
      setIncomingRide(data);
      setTimeLeft(30); // 30 seconds to accept
    });

    socket.on('ride_request_expired', () => {
      setIncomingRide(null);
    });

    return () => {
      socket.off('ride_request');
      socket.off('ride_request_expired');
    };
  }, [socket, isConnected]);

  const showSystemActiveToast = () => {
    Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setShowToast(false));
    }, 2000);
  };

  const updateStatusOnBackend = async (online: boolean, lat?: number, lng?: number): Promise<boolean> => {
    try {
      await api.post('/driver/status', {
        isOnline: online,
        latitude: lat,
        longitude: lng,
      });
      return true;
    } catch (err) {
      console.error('Failed to update status', err);
      return false;
    }
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to go online.');
      return false;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    const success = await updateStatusOnBackend(true, loc.coords.latitude, loc.coords.longitude);
    if (!success) {
      Alert.alert('Error', 'Could not communicate with the server.');
      return false;
    }

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10s
        distanceInterval: 10, // Or every 10 meters
      },
      (newLoc) => {
        setLocation(newLoc);
        updateStatusOnBackend(true, newLoc.coords.latitude, newLoc.coords.longitude);
      }
    );
    return true;
  };

  const stopTracking = async () => {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
    await updateStatusOnBackend(false);
  };

  const handleToggle = async () => {
    const goingOnline = !isOnline;
    
    if (goingOnline) {
      const success = await startTracking();
      if (success) {
        setIsOnline(true);
        showSystemActiveToast();
      }
    } else {
      await stopTracking();
      setIsOnline(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchStatusAndRide = async () => {
        if (!accessToken) return;
        try {
          // Fetch driver status
          const statusRes = await api.get('/driver/status');
          const data = statusRes.data;
          setIsOnline(data.isOnline);
          if (data.isOnline && !locationSub.current) {
             startTracking();
          }

          // Fetch current ride
          const rideRes = await api.get('/driver/ride/current');
          const rideData = rideRes.data;
          if (rideData.ride) {
              const ride = rideData.ride;
              
              const pickupLat = ride?.pickup?.coordinates?.coordinates[1] ?? 15.4865;
              const pickupLng = ride?.pickup?.coordinates?.coordinates[0] ?? 120.9601;
              const dropoffLat = ride?.dropoff?.coordinates?.coordinates[1] ?? 15.475;
              const dropoffLng = ride?.dropoff?.coordinates?.coordinates[0] ?? 120.958;
              const passengerName = ride.passengerId ? `${ride.passengerId.firstName} ${ride.passengerId.lastName}` : 'Passenger';
              
              const params = {
                rideId: ride._id,
                fare: ride.fare,
                pickupFull: ride.pickup?.address,
                dropoffFull: ride.dropoff?.address,
                pickupLat: pickupLat.toString(),
                pickupLng: pickupLng.toString(),
                dropoffLat: dropoffLat.toString(),
                dropoffLng: dropoffLng.toString(),
                name: passengerName,
              };

              if (ride.status === 'driver_assigned' || ride.status === 'arrived_pickup') {
                router.push({
                  pathname: '/pickup-passenger',
                  params: {
                    ...params,
                    recoveredState: ride.status === 'arrived_pickup' ? 'arrived' : undefined
                  }
                });
              } else if (ride.status === 'trip_started') {
                router.push({
                  pathname: '/trip-started',
                  params
                });
              }
            }
        } catch (err) {
          console.error(err);
        }
      };
      fetchStatusAndRide();
    }, [accessToken])
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  const handleAcceptRide = async (rideId: string) => {
    try {
      const res = await api.post(`/driver/ride/${rideId}/accept`);
      const data = res.data;
      const passengerName = data.ride?.passengerId 
          ? `${data.ride.passengerId.firstName} ${data.ride.passengerId.lastName}` 
          : 'Passenger';

        const pickupLat = incomingRide?.pickup?.coordinates?.coordinates[1] ?? 15.4865;
        const pickupLng = incomingRide?.pickup?.coordinates?.coordinates[0] ?? 120.9601;
        const dropoffLat = incomingRide?.dropoff?.coordinates?.coordinates[1] ?? 15.475;
        const dropoffLng = incomingRide?.dropoff?.coordinates?.coordinates[0] ?? 120.958;
        
        // Go to trip details
        router.push({ 
          pathname: '/pickup-passenger', 
          params: { 
            rideId,
            name: passengerName,
            fare: incomingRide?.fare,
            pickupFull: incomingRide?.pickup?.address,
            dropoffFull: incomingRide?.dropoff?.address,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
          } 
        });
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        Alert.alert('Error', 'Ride no longer available.');
      } else {
        Alert.alert('Error', 'Failed to accept ride.');
      }
    } finally {
      setIncomingRide(null);
    }
  };

  const handleDeclineRide = async (rideId: string) => {
    setIncomingRide(null);
    try {
      await api.post(`/driver/ride/${rideId}/decline`);
    } catch (err) {
      console.error('Failed to decline ride', err);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 15.4845,
          longitude: 120.9612,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {incomingRide && (
          <Marker
            coordinate={{
              latitude: incomingRide.pickup.coordinates.coordinates[1],
              longitude: incomingRide.pickup.coordinates.coordinates[0],
            }}
            title="Pickup Location"
            pinColor={ACCENT}
          />
        )}
      </MapView>


      {/* Earnings pill */}
      <TouchableOpacity
        style={[styles.earningsPill, { top: insets.top + 10 }]}
        activeOpacity={0.85}
      >
        <Ionicons name="home" size={16} color="#fff" />
        <Text style={styles.earningsText}>Earnings</Text>
      </TouchableOpacity>

      {/* Bottom bar: power button + toast side by side */}
      <View style={[styles.bottomBar, { bottom: insets.top + 0 }]}>
        {/* Power circle — only shown when online */}
        {isOnline && (
          <TouchableOpacity
            style={styles.powerCircleOnline}
            onPress={handleToggle}
            activeOpacity={0.85}
          >
            <Ionicons name="power" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {/* System Active toast — shown right after going online */}
        {showToast && (
          <Animated.View style={[styles.toastPill, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>System Active. Stay safe on the road!</Text>
          </Animated.View>
        )}

        {/* Offline: show full-width Go Online pill */}
        {!isOnline && !showToast && (
          <TouchableOpacity
            style={styles.goOnlineButton}
            onPress={handleToggle}
            activeOpacity={0.85}
          >
            <Text style={styles.goOnlineText}>Go Online</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Incoming Request Modal Overlay */}
      {incomingRide && (
        <RequestModal
          ride={incomingRide}
          timeLeft={timeLeft}
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  earningsPill: {
    position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, gap: 6, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  earningsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  powerCircleOnline: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  toastPill: {
    flex: 1, backgroundColor: ONLINE_GREEN, borderRadius: 50, paddingHorizontal: 18,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  goOnlineButton: {
    flex: 1, backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 16,
    alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  goOnlineText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

