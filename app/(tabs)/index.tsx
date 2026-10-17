import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated as RNAnimated, Alert, Linking, Platform, ScrollView, AppState, Vibration, Image } from 'react-native';
import MapView, { Marker, Polygon, MapViewDirections } from '@/components/MapWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import * as Location from 'expo-location';
import { AuthContext } from '@/context/AuthContext';
import { SocketContext } from '@/context/SocketContext';
import RequestModal from '@/components/RequestModal';
import DiscountPassengerModal from '@/components/DiscountPassengerModal';
import RideCancelledModal from '@/components/RideCancelledModal';
import api from '@/utils/axios';
import { useNetworkSpeed } from '@/utils/useNetworkSpeed';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

const ACCENT = Colors.light.tint;

const CABANATUAN_BOUNDARY = [
  { latitude: 15.58, longitude: 120.90 },
  { latitude: 15.58, longitude: 121.05 },
  { latitude: 15.42, longitude: 121.05 },
  { latitude: 15.42, longitude: 120.90 },
];
const ONLINE_GREEN = '#22c55e';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const SHEET_EXPANDED_HEIGHT = 490;
const SHEET_COLLAPSED_HEIGHT = 160;

type RideState = 'idle' | 'pickup' | 'arrived' | 'trip_started' | 'dropoff_summary';

export default function HomeScreen() {
  const isSlowNetwork = useNetworkSpeed();
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const [rideState, setRideState] = useState<RideState>('idle');
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);
  const [routeOrigin, setRouteOrigin] = useState<{latitude: number, longitude: number} | null>(null);

  // When rideState changes, reset routeOrigin
  useEffect(() => {
    if (rideState !== 'pickup' && rideState !== 'trip_started') {
       setRouteOrigin(null);
    }
  }, [rideState]);

  useEffect(() => {
     if (!routeOrigin && location && (rideState === 'pickup' || rideState === 'trip_started')) {
         setRouteOrigin({ latitude: location.coords.latitude, longitude: location.coords.longitude });
     }
  }, [location, rideState, routeOrigin]);

  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  useEffect(() => {
     if (routeCoords.length > 0 && location && (rideState === 'pickup' || rideState === 'trip_started')) {
         const dLoc = location.coords;
         let minDistance = Infinity;
         for (const pt of routeCoords) {
             const d = getDistanceFromLatLonInKm(dLoc.latitude, dLoc.longitude, pt.latitude, pt.longitude);
             if (d < minDistance) minDistance = d;
         }
         if (minDistance > 0.15) {
             setRouteOrigin({ latitude: dLoc.latitude, longitude: dLoc.longitude });
             setRouteCoords([]);
         }
     }
  }, [location, routeCoords, rideState]);

  const [showEarnings, setShowEarnings] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState<number | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // TODA Terminal Queue State
  const [queueInfo, setQueueInfo] = useState<{
    inQueue: boolean;
    position: number | null;
    totalInQueue: number;
    isDrifting: boolean;
    driftSecondsLeft: number | null;
    terminalName: string | null;
  } | null>(null);

  // Discount passenger modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showRideCancelledModal, setShowRideCancelledModal] = useState(false);
  const [cancelledReason, setCancelledReason] = useState('Change of plans');

  const insets = useSafeAreaInsets();
  const toastOpacity = useRef(new RNAnimated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView>(null);
  const initialEtaSent = useRef<{ [rideId: string]: boolean }>({});
  
  const { accessToken, emergencyContact } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const router = useRouter();

  // Bottom Sheet Animation
  const sheetHeight = useSharedValue(SHEET_EXPANDED_HEIGHT);
  const dragStart = useSharedValue(0);

  const snapToExpanded = () => {
      sheetHeight.value = withTiming(SHEET_EXPANDED_HEIGHT, { duration: 300 });
  };

  const snapToCollapsed = () => {
      sheetHeight.value = withTiming(SHEET_COLLAPSED_HEIGHT, { duration: 300 });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      dragStart.value = sheetHeight.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newHeight = dragStart.value - event.translationY;
      sheetHeight.value = Math.max(
          SHEET_COLLAPSED_HEIGHT,
          Math.min(SHEET_EXPANDED_HEIGHT, newHeight)
      );
    })
    .onEnd((event) => {
      'worklet';
      const velocity = event.velocityY;
      const currentHeight = sheetHeight.value;
      const midPoint = (SHEET_EXPANDED_HEIGHT + SHEET_COLLAPSED_HEIGHT) / 2;

      // Handle tap detection
      if (Math.abs(event.translationY) < 10 && Math.abs(event.translationX) < 10) {
        if (currentHeight > midPoint) {
           runOnJS(snapToCollapsed)();
        } else {
           runOnJS(snapToExpanded)();
        }
        return;
      }

      if (velocity > 500 || currentHeight < midPoint) {
          runOnJS(snapToCollapsed)();
      } else {
          runOnJS(snapToExpanded)();
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
      height: sheetHeight.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
      opacity: (sheetHeight.value - SHEET_COLLAPSED_HEIGHT) / (SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT),
  }));

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

  const [summaryCountdown, setSummaryCountdown] = useState<number | null>(null);
  const currentRideRef = useRef(currentRide);
  useEffect(() => {
    currentRideRef.current = currentRide;
  }, [currentRide]);

  const handleDismissSummary = useCallback(async () => {
    const rideId = currentRideRef.current?._id;
    setRideState('idle');
    setCurrentRide(null);
    setSummaryCountdown(null);
    snapToCollapsed();

    try {
      if (rideId) {
        await api.post(`/driver/ride/${rideId}/dismiss-summary`);
      } else {
        await api.post('/driver/ride/dismiss-summary');
      }
    } catch (err) {
      console.error('Failed to dismiss summary on backend', err);
    }
  }, []);

  // Timer for dropoff summary auto-close
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (rideState === 'dropoff_summary') {
      setSummaryCountdown(15);
      interval = setInterval(() => {
        setSummaryCountdown((prev) => {
          if (prev && prev <= 1) {
            handleDismissSummary();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setSummaryCountdown(null);
    }
    return () => clearInterval(interval);
  }, [rideState, handleDismissSummary]);

  // Ensure driver joins the ride room whenever connected and has a ride
  useEffect(() => {
    if (!socket || !currentRide?._id) return;

    const syncWithBackend = async () => {
      console.log('Driver socket connected! Syncing ride room...');
      socket.emit('join_ride', { rideId: currentRide._id });
      try {
          const res = await api.get('/driver/ride/current');
          if (res.data && res.data.ride) {
              const ride = res.data.ride;
              setCurrentRide(ride);
              if (ride.status === 'pending') {
                  setRideState('idle');
                  setCurrentRide(null);
                  const elapsedSeconds = Math.floor((new Date().getTime() - new Date(ride.updatedAt).getTime()) / 1000);
                  const remaining = Math.max(0, 30 - elapsedSeconds);
                  if (remaining > 0) {
                      setIncomingRide({
                          rideId: ride._id,
                          pickup: ride.pickup,
                          dropoff: ride.dropoff,
                          fare: ride.fare,
                          distanceKm: ride.distanceKm,
                          paymentMethod: ride.paymentMethod,
                      });
                      setTimeLeft(remaining);
                  } else {
                      setIncomingRide(null);
                  }
              } else if (ride.status === 'driver_assigned') {
                  setRideState('pickup');
              } else if (ride.status === 'arrived_pickup') {
                  setRideState('arrived');
              } else if (ride.status === 'trip_started') {
                  setRideState('trip_started');
              } else if (ride.status === 'completed') {
                  setRideState('dropoff_summary');
              } else {
                  setRideState('idle');
                  setCurrentRide(null);
                  setIncomingRide(null);
              }
          } else {
              setRideState('idle');
              setCurrentRide(null);
              setIncomingRide(null);
          }
      } catch (err) {
          console.log('Failed to sync on reconnect');
      }
    };

    if (isConnected) {
       syncWithBackend();
    }

    socket.on('connect', syncWithBackend);

    return () => {
      socket.off('connect', syncWithBackend);
    };
  }, [socket, currentRide?._id, isConnected]);
  const [fareSettings, setFareSettings] = useState({ baseFare: 25, perKmFare: 8.5, baseDistance: 3 });

  useEffect(() => {
    const fetchFareSettings = async () => {
      try {
        const res = await api.get('/passenger/settings/fare');
        if (res.data) {
          setFareSettings(res.data);
        }
      } catch (err) {
        console.error('Error fetching fare settings:', err);
      }
    };
    fetchFareSettings();
  }, []);

  // Listen to Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingDispatch = (data: any) => {
      // Immediately acknowledge receipt to the distributor buffer
      if (data?.bufferId) {
        api.post('/driver/dispatch/ack', { bufferId: data.bufferId }).catch((err) => {
          console.error('Failed to send dispatch ACK', err);
        });
      }

      setIncomingRide(data);

      let countdown = 30;
      if (data?.expiresAt) {
        const remaining = Math.max(1, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        countdown = remaining;
      }
      setTimeLeft(countdown);
      Vibration.vibrate([0, 500, 200, 500]); // Vibrate twice
    };

    socket.on('dispatch_offer', handleIncomingDispatch);
    socket.on('ride_request', handleIncomingDispatch);

    socket.on('ride_request_expired', () => {
      setIncomingRide(null);
    });
    
    socket.on('ride_cancelled', (data: any) => {
        if (rideState !== 'idle') {
            setCancelledReason(data?.reason || 'The passenger has cancelled the ride.');
            setShowRideCancelledModal(true);
        }
    });

    socket.on('ride_status_update', (data: any) => {
      if (rideState !== 'idle' && currentRide && data.rideId === currentRide._id) {
        if (data.status === 'arrived_pickup') {
          setRideState('arrived');
          snapToExpanded();
        } else if (data.status === 'completed') {
          setRideState('dropoff_summary');
          snapToExpanded();
        }
      }
    });

    socket.on('force_offline', (data: any) => {
      Alert.alert('Status Updated', data?.reason || "You've been marked offline due to prolonged inactivity.");
      stopTracking();
      setIsOnline(false);
      setQueueInfo(null);
    });

    socket.on('queue_status', (data: any) => {
      setQueueInfo(data);
    });

    const handleWalletUpdated = () => {
      api.get('/driver/ride/earnings/daily').then((res) => {
        if (res.data?.earnings !== undefined) {
          setDailyEarnings(res.data.earnings);
        }
      }).catch(() => {});
    };
    socket.on('wallet_updated', handleWalletUpdated);

    return () => {
      socket.off('dispatch_offer', handleIncomingDispatch);
      socket.off('ride_request', handleIncomingDispatch);
      socket.off('ride_request_expired');
      socket.off('ride_cancelled');
      socket.off('ride_status_update');
      socket.off('force_offline');
      socket.off('queue_status');
      socket.off('wallet_updated', handleWalletUpdated);
    };
  }, [socket, isConnected, rideState, currentRide]);

  // Handle AppState changes (returning from background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App returned to foreground, force a socket reconnect to clear any zombie connections
        if (socket) {
           socket.disconnect();
           setTimeout(() => {
               socket.connect();
               // Wait 1 second before resyncing to ensure the backend's disconnect handler finishes first
               setTimeout(() => {
                 if (isOnline && location) {
                    updateStatusOnBackend(true, location.coords.latitude, location.coords.longitude);
                 }
               }, 1000);
           }, 100);
        } else if (isOnline && location) {
           updateStatusOnBackend(true, location.coords.latitude, location.coords.longitude);
        }

        // Check for any buffered dispatch waiting for this driver
        api.get('/driver/dispatch/active').then((res) => {
          if (res.data?.offer) {
            const offer = res.data.offer;
            if (offer.bufferId) {
              api.post('/driver/dispatch/ack', { bufferId: offer.bufferId }).catch(() => {});
            }
            setIncomingRide(offer);
            const remaining = Math.max(1, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
            Vibration.vibrate([0, 500, 200, 500]);
          }
        }).catch(() => {});
      }
    });
    return () => {
      subscription.remove();
    };
  }, [socket, isOnline, location]);

  // Ride location updates emission
  useEffect(() => {
      if (rideState === 'idle' || rideState === 'dropoff_summary' || !currentRide || !socket || !isConnected) return;
      const interval = setInterval(() => {
          if (location) {
             socket.emit('driver_location_update', { 
               rideId: currentRide._id, 
               location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
               duration: routeDuration
             });
          }
      }, 5000); // update every 5 seconds
      return () => clearInterval(interval);
  }, [rideState, currentRide, socket, isConnected, location, routeDuration]);

  const showSystemActiveToast = () => {
    RNAnimated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
        RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setShowToast(false);
        });
    }, 3000);
  };

  const toggleEarnings = async () => {
      if (showEarnings) {
          setShowEarnings(false);
      } else {
          setShowEarnings(true);
          setLoadingEarnings(true);
          try {
              const res = await api.get('/driver/ride/earnings/daily');
              setDailyEarnings(res.data.earnings);
          } catch (err) {
              console.error(err);
          } finally {
              setLoadingEarnings(false);
          }
      }
  };

  const updateStatusOnBackend = async (online: boolean, lat?: number, lng?: number): Promise<boolean> => {
    try {
      const res = await api.post('/driver/status', {
        isOnline: online,
        latitude: lat,
        longitude: lng,
      });
      if (res.data?.queueInfo) {
        setQueueInfo(res.data.queueInfo);
      } else if (!online) {
        setQueueInfo(null);
      }
      return true;
    } catch (err) {
      console.error('Failed to update status', err);
      return false;
    }
  };

  const startTracking = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to go online.');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert('Background Permission Denied', 'Background location permission is recommended for tracking during rides.');
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
        // We must ping the backend even when busy (driving to passenger) 
        // so the system can verify we are moving and prevent false "Unresponsive" strikes.
        updateStatusOnBackend(true, newLoc.coords.latitude, newLoc.coords.longitude);
      }
    );

    if (bgStatus === 'granted') {
      try {
        await Location.startLocationUpdatesAsync('background-location-task', {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'FINDER Driver Online',
            notificationBody: 'Your location is being tracked while online.',
            notificationColor: '#4f46e5',
          }
        });
      } catch (err) {
        console.log('Could not start background location updates:', err);
      }
    }

    return true;
  };

  const stopTracking = async () => {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
    const isBgTracking = await Location.hasStartedLocationUpdatesAsync('background-location-task');
    if (isBgTracking) {
      await Location.stopLocationUpdatesAsync('background-location-task');
    }
    setQueueInfo(null);
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
      setQueueInfo(null);
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
          if (data.queueInfo) {
            setQueueInfo(data.queueInfo);
          } else if (!data.isOnline) {
            setQueueInfo(null);
          }
          if (data.isOnline && !locationSub.current) {
             startTracking();
          }

          // Fetch current ride
          const rideRes = await api.get('/driver/ride/current');
          const rideData = rideRes.data;
          if (rideData.ride) {
              const ride = rideData.ride;
              setCurrentRide(ride);
              if (ride.status === 'pending') {
                  setRideState('idle');
                  setCurrentRide(null);
                  const elapsedSeconds = Math.floor((new Date().getTime() - new Date(ride.updatedAt).getTime()) / 1000);
                  const remaining = Math.max(0, 30 - elapsedSeconds);
                  if (remaining > 0) {
                      setIncomingRide({
                          rideId: ride._id,
                          pickup: ride.pickup,
                          dropoff: ride.dropoff,
                          fare: ride.fare,
                          distanceKm: ride.distanceKm,
                      });
                      setTimeLeft(remaining);
                  } else {
                      setIncomingRide(null);
                  }
              } else if (ride.status === 'driver_assigned') {
                  setRideState('pickup');
                  snapToExpanded();
              } else if (ride.status === 'arrived_pickup') {
                  setRideState('arrived');
                  snapToExpanded();
              } else if (ride.status === 'trip_started') {
                  setRideState('trip_started');
                  snapToExpanded();
              } else if (ride.status === 'completed') {
                  setRideState('dropoff_summary');
                  snapToExpanded();
              } else {
                  setRideState('idle');
                  setCurrentRide(null);
                  setIncomingRide(null);
              }
            } else {
                setRideState('idle');
                setCurrentRide(null);
                // Check if there is an active buffered offer for this driver
                try {
                  const dispatchRes = await api.get('/driver/dispatch/active');
                  if (dispatchRes.data?.offer) {
                    const offer = dispatchRes.data.offer;
                    if (offer.bufferId) {
                      api.post('/driver/dispatch/ack', { bufferId: offer.bufferId }).catch(() => {});
                    }
                    setIncomingRide(offer);
                    const remaining = Math.max(1, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
                    setTimeLeft(remaining);
                  } else {
                    setIncomingRide(null);
                  }
                } catch (dErr) {
                  setIncomingRide(null);
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
      let res;
      if (incomingRide?.bufferId) {
        res = await api.post(`/driver/dispatch/${incomingRide.bufferId}/accept`);
      } else {
        res = await api.post(`/driver/ride/${rideId}/accept`);
      }
      const data = res.data;
      
      setCurrentRide(data.ride);
      setRideState('pickup');
      snapToExpanded();
      socket?.emit('join_ride', { rideId: data.ride?._id || rideId });

    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        Alert.alert('Error', err.response?.data?.message || 'Ride no longer available.');
      } else {
        Alert.alert('Error', 'Failed to accept ride.');
      }
    } finally {
      setIncomingRide(null);
    }
  };

  const handleDeclineRide = async (rideId: string) => {
    const bufferId = incomingRide?.bufferId;
    setIncomingRide(null);
    try {
      if (bufferId) {
        await api.post(`/driver/dispatch/${bufferId}/decline`);
      } else {
        await api.post(`/driver/ride/${rideId}/decline`);
      }
    } catch (err) {
      console.error('Failed to decline ride', err);
    }
  };

  const updateRideStatus = async (status: string, extraData?: any) => {
      if (!currentRide?._id) return true;
      try {
          const res = await api.patch(`/driver/ride/${currentRide._id}/status`, {
              status,
              latitude: location?.coords?.latitude,
              longitude: location?.coords?.longitude,
              ...extraData
          });
          if (res.data?.ride) {
              const updatedRide = res.data.ride;
              if (currentRide.passengerId && typeof currentRide.passengerId === 'object' && (!updatedRide.passengerId || typeof updatedRide.passengerId === 'string')) {
                  updatedRide.passengerId = currentRide.passengerId;
              } else if (currentRide.passengerId && typeof currentRide.passengerId === 'object' && updatedRide.passengerId && typeof updatedRide.passengerId === 'object') {
                  updatedRide.passengerId = {
                      ...currentRide.passengerId,
                      ...updatedRide.passengerId,
                      profilePicture: updatedRide.passengerId.profilePicture || currentRide.passengerId.profilePicture,
                  };
              }
              setCurrentRide(updatedRide);
          }
          return true;
      } catch (err: any) {
          console.error(err);
          if (err.response?.status === 400 && err.response?.data?.code === 'GPS_TOO_FAR') {
              Alert.alert('Too Far', err.response.data.message);
              return 'too_far';
          }
          const serverMsg = err.response?.data?.message || err.message || 'Failed to update status.';
          Alert.alert('Status Update Error', serverMsg);
          return false;
      }
  };

  const handleBackToHome = () => {
    setShowRideCancelledModal(false);
    setRideState('idle');
    setCurrentRide(null);
    snapToCollapsed();
  };

  const handleDiscountConfirm = async (discountedCount: number, updatedFare: number) => {
      setShowDiscountModal(false);
      const result = await updateRideStatus('arrived_pickup', {
          discountedPassengers: discountedCount,
          updatedFare,
      });
      if (result === 'too_far') return;
      if (!result) return Alert.alert('Error', 'Failed to update status.');
      // Update ride fare locally so the summary screen shows the correct amount
      if (currentRide) {
          setCurrentRide((prev: any) => ({ ...prev, fare: updatedFare.toFixed(2) }));
      }
      setRideState('arrived');
      snapToExpanded();
  };

  const handleActionPress = async () => {
      if (rideState === 'pickup') {
          if (currentRide?.bookingFor === 'myself') {
              // System verified discount, skip modal
              const result = await updateRideStatus('arrived_pickup');
              if (result) {
                  setRideState('arrived');
                  snapToExpanded();
              }
          } else {
              // Show discount verification dialog before marking arrived
              setShowDiscountModal(true);
          }
          return;
      } else if (rideState === 'arrived') {
          const result = await updateRideStatus('trip_started');
          if (result === 'too_far') return;
          if (!result) return Alert.alert('Error', 'Failed to update status.');
          setRideState('trip_started');
          snapToExpanded();
      } else if (rideState === 'trip_started') {
          Alert.alert(
              'Drop Off',
              'Are you sure you want to complete this ride and drop off the passenger?',
              [
                  { text: 'Cancel', style: 'cancel' },
                  {
                      text: 'Confirm',
                      onPress: async () => {
                          const result = await updateRideStatus('completed');
                          if (result === 'too_far') return;
                          if (!result) return Alert.alert('Error', 'Failed to update status.');
                          setRideState('dropoff_summary');
                          snapToExpanded();
                      }
                  }
              ]
          );
      } else if (rideState === 'dropoff_summary') {
          handleDismissSummary();
      }
  };

  const handleCancelRide = async () => {
      const cancelApi = async (reason?: string, forceStandardCancel?: boolean) => {
        if (currentRide?._id) {
            try {
                await api.post(`/driver/ride/${currentRide._id}/cancel`, { reason, forceStandardCancel });
                setRideState('idle');
                setCurrentRide(null);
                snapToCollapsed();
            } catch (err: any) {
                if (err.response?.data?.code === 'PASSENGER_IS_ACTIVE') {
                  Alert.alert(
                    'Passenger is Active',
                    'The passenger has recently communicated. Cancelling now will be recorded as a standard cancellation against your account. Proceed?',
                    [
                      { text: 'No', style: 'cancel' },
                      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelApi(reason, true) }
                    ]
                  );
                  return;
                }
                Alert.alert('Error', err.response?.data?.message || 'Could not cancel ride.');
            }
        }
      };

      const options = [
        { text: 'Passenger Unresponsive', onPress: () => cancelApi('Passenger Unresponsive (Wait 5 mins)') },
        { text: 'Other Reason (Strike)', style: 'destructive' as const, onPress: () => cancelApi('Other reason') },
        { text: 'Back', style: 'cancel' as const }
      ];

      Alert.alert(
        'Cancel Ride',
        'Please select a reason for cancellation.',
        options
      );
  };

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
                  onPress: async () => {
                      try {
                          await api.post('/emergency-contact/trigger', {
                              latitude: location?.coords?.latitude,
                              longitude: location?.coords?.longitude,
                          });
                          Alert.alert('Emergency Alert Sent', 'An SMS alert has been sent to your emergency contact automatically.');
                      } catch (err: any) {
                          console.error(err);
                          Alert.alert('Error', err.response?.data?.message || 'Failed to send emergency alert.');
                      }
                  }
              }
          ]
      );
  };

  // UI Helpers
  const passengerName = currentRide?.passengerId 
    ? `${currentRide.passengerId.firstName} ${currentRide.passengerId.lastName}` 
    : 'Passenger';
  const passengerPhoto = currentRide?.passengerId?.profilePicture || null;
  const fare = currentRide?.fare || '70.00';
  const pickupFull = currentRide?.pickup?.address || 'Pickup Location';
  const dropoffFull = currentRide?.dropoff?.address || 'Dropoff Location';

  const pLat = currentRide?.pickup?.coordinates?.coordinates[1] ?? 15.4865;
  const pLng = currentRide?.pickup?.coordinates?.coordinates[0] ?? 120.9601;
  const dLat = currentRide?.dropoff?.coordinates?.coordinates[1] ?? 15.4748;
  const dLng = currentRide?.dropoff?.coordinates?.coordinates[0] ?? 120.9673;

  const showEmergency = rideState === 'pickup' || rideState === 'arrived' || rideState === 'trip_started';

  if (rideState === 'dropoff_summary') {
      const BOOKING_REF = currentRide?._id ? `Trip - ${currentRide._id.slice(-6).toUpperCase()}` : 'Trip - 000000';
      return (
        <SafeAreaView style={styles.summaryContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Drop off Summary</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Passenger</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      {passengerPhoto ? (
                        <Image
                          source={{ uri: passengerPhoto }}
                          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f0f0' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="person" size={18} color="#888" />
                        </View>
                      )}
                      <Text style={styles.sectionValue}>{passengerName}</Text>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Total Fare</Text>
                    <Text style={styles.fareValue}>₱ {fare}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoTable}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Booking Reference ID</Text>
                        <Text style={styles.infoValue}>{BOOKING_REF}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Trip fare</Text>
                        <Text style={styles.infoValue}>₱  {fare}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payment Method</Text>
                        <Text style={[styles.infoValue, { color: currentRide?.paymentMethod === 'wallet' ? '#2563eb' : '#ea580c', fontWeight: '700' }]}>
                            {currentRide?.paymentMethod === 'wallet' ? 'Credited to Wallet (Prepaid)' : 'Cash Collected'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Distance</Text>
                        <Text style={styles.infoValue}>{routeDistance.toFixed(1)} Km</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>
                            {currentRide?.actualDurationMins != null 
                                ? `${currentRide.actualDurationMins} mins` 
                                : `${Math.round(routeDuration)} mins`}
                        </Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.locationBlock}>
                    <View style={styles.locationRow}>
                        <View style={styles.dotFilled} />
                        <Text style={styles.locationTitle}>Pick up location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{pickupFull}</Text>
                </View>
                <View style={styles.locationBlock}>
                    <View style={styles.locationRow}>
                        <View style={styles.dotOutline} />
                        <Text style={styles.locationTitle}>Drop off location</Text>
                    </View>
                    <Text style={styles.locationAddress}>{dropoffFull}</Text>
                </View>
                <TouchableOpacity
                    style={styles.confirmBtn}
                    activeOpacity={0.85}
                    onPress={handleDismissSummary}
                >
                    <Text style={styles.confirmText}>
                        Back to Map {summaryCountdown !== null ? `(${summaryCountdown}s)` : ''}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
      );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
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

        {incomingRide && rideState === 'idle' && (
          <Marker
            coordinate={{
              latitude: incomingRide.pickup.coordinates.coordinates[1],
              longitude: incomingRide.pickup.coordinates.coordinates[0],
            }}
            title="Pickup Location"
            pinColor={ACCENT}
          />
        )}
        
        {(rideState === 'pickup' || rideState === 'arrived') && (
            <Marker coordinate={{ latitude: pLat, longitude: pLng }} title="Pickup Location" />
        )}

        {rideState === 'trip_started' && (
            <Marker coordinate={{ latitude: dLat, longitude: dLng }} title="Drop off Location" />
        )}

        {routeOrigin && (rideState === 'pickup' || rideState === 'trip_started') && (
            <MapViewDirections
                key={rideState}
                origin={routeOrigin}
                destination={
                    rideState === 'pickup'
                        ? { latitude: pLat, longitude: pLng }
                        : { latitude: dLat, longitude: dLng }
                }
                apikey="backend-proxy"
                directionsServiceBaseUrl={`${API_URL}/maps/api/directions/json`}
                fetchHeaders={{ Authorization: `Bearer ${accessToken}` }}
                strokeWidth={4}
                strokeColor={ACCENT}
                onReady={result => {
                    setRouteDistance(result.distance);
                    setRouteDuration(result.duration);
                    setRouteCoords(result.coordinates);
                    if (currentRide?._id && socket && isConnected && location?.coords) {
                      socket.emit('driver_location_update', {
                        rideId: currentRide._id,
                        location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
                        duration: result.duration,
                      });
                    }
                    if (rideState === 'pickup' && currentRide && !initialEtaSent.current[currentRide._id]) {
                      initialEtaSent.current[currentRide._id] = true;
                      api.patch(`/driver/ride/${currentRide._id}/eta`, { duration: result.duration }).catch(console.error);
                    }
                }}
                onError={(errorMessage) => {
                    console.error('MapViewDirections Error:', errorMessage);
                }}
            />
        )}
      </MapView>

      {/* Network Warning Banner */}
      {isSlowNetwork && (
        <View style={{ position: 'absolute', top: insets.top + 60, alignSelf: 'center', backgroundColor: 'rgba(220, 53, 69, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>⚠️ Slow Network Connection</Text>
        </View>
      )}

      {/* Earnings pill / bubble */}
      {rideState === 'idle' && (
        showEarnings ? (
            <View style={[styles.earningsBubble, { top: insets.top + 10 }]}>
                <TouchableOpacity style={styles.earningsCloseBtn} onPress={toggleEarnings} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.earningsBubbleContent}>
                    <Text style={styles.earningsBubbleLabel}>Earnings</Text>
                    {loadingEarnings ? (
                        <Text style={styles.earningsBubbleAmount}>...</Text>
                    ) : (
                        <Text style={styles.earningsBubbleAmount}>₱ {dailyEarnings?.toFixed(2) || '0.00'}</Text>
                    )}
                </View>
            </View>
        ) : (
            <TouchableOpacity
                style={[styles.earningsPill, { top: insets.top + 10 }]}
                activeOpacity={0.85}
                onPress={toggleEarnings}
            >
                <Ionicons name="briefcase" size={16} color="#fff" />
                <Text style={styles.earningsText}>Earnings</Text>
            </TouchableOpacity>
        )
      )}

      {/* TODA Terminal Queue Badge (Upper Right) */}
      {rideState === 'idle' && isOnline && queueInfo?.inQueue && (
        <View style={[styles.queueBadge, { top: insets.top + 10 }]}>
          <View
            style={[
              styles.queueDot,
              queueInfo.isDrifting ? styles.queueDotDrift : styles.queueDotActive,
            ]}
          />
          <View style={styles.queueContent}>
            <Text style={styles.queueTitle}>
              {queueInfo.terminalName || 'Pila'}: #{queueInfo.position}
            </Text>
            <Text style={styles.queueSub}>
              {queueInfo.isDrifting
                ? `Drifting (${queueInfo.driftSecondsLeft ?? 0}s left)`
                : `${queueInfo.totalInQueue} in queue`}
            </Text>
          </View>
        </View>
      )}

      {/* Floating One Tap Emergency Button */}
      {showEmergency && (
          <TouchableOpacity
              style={[styles.emergencyFloatingBtn, { top: insets.top + 16 }]}
              onPress={triggerEmergencyAlert}
              activeOpacity={0.85}
          >
              <Ionicons name="alert-circle" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emergencyFloatingTxt}>Emergency</Text>
          </TouchableOpacity>
      )}

      {/* Bottom bar: power button + toast side by side */}
      {rideState === 'idle' && (
        <View style={[styles.bottomBar, { bottom: insets.top + 0 }]}>
            {isOnline && (
            <TouchableOpacity
                style={styles.powerCircleOnline}
                onPress={handleToggle}
                activeOpacity={0.85}
            >
                <Ionicons name="power" size={26} color="#fff" />
            </TouchableOpacity>
            )}

            {showToast && (
            <RNAnimated.View style={[styles.toastPill, { opacity: toastOpacity }]}>
                <Text style={styles.toastText}>System Active. Stay safe on the road!</Text>
            </RNAnimated.View>
            )}

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
      )}

      {/* Incoming Request Modal Overlay */}
      {incomingRide && rideState === 'idle' && (
        <RequestModal
          ride={incomingRide}
          timeLeft={timeLeft}
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
        />
      )}

      {/* Ride Bottom Sheet */}
      {rideState !== 'idle' && (
        <Animated.View style={[styles.bottomSheet, animatedSheetStyle]}>
            <SafeAreaView edges={['bottom']} style={styles.sheetSafeContainer}>
                {/* Draggable Handle */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={styles.handleArea}>
                        <View style={styles.handle} />
                    </Animated.View>
                </GestureDetector>

                <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                    {passengerPhoto ? (
                      <Image
                        source={{ uri: passengerPhoto }}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person" size={20} color="#888" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Passenger</Text>
                      <Text style={styles.value}>{passengerName}</Text>
                    </View>
                </View>

                <Text style={styles.sheetTitle}>
                    {rideState === 'pickup' || rideState === 'arrived' ? 'Pick up passenger' : 'Trip started'}
                </Text>
                <View style={styles.divider} />

                <Animated.View style={[styles.expandableContent, animatedContentStyle]}>
                    <View style={styles.locationBlock}>
                        <View style={styles.locationRow}>
                            {rideState === 'pickup' || rideState === 'arrived' ? (
                                <View style={styles.dotFilled} />
                            ) : (
                                <View style={styles.dotOutline} />
                            )}
                            <Text style={styles.locationTitle}>
                                {rideState === 'pickup' || rideState === 'arrived' ? 'Pick up location' : 'Drop off location'}
                            </Text>
                        </View>
                        <Text style={styles.locationAddress}>
                            {rideState === 'pickup' || rideState === 'arrived' ? pickupFull : dropoffFull}
                        </Text>
                    </View>

                    <View style={[styles.fareRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <View>
                            <Text style={styles.fareLabel}>Total Fare</Text>
                            <Text style={styles.fareValue}>₱ {fare}</Text>
                        </View>
                        <View style={{ backgroundColor: currentRide?.paymentMethod === 'wallet' ? '#eff6ff' : '#fff7ed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: currentRide?.paymentMethod === 'wallet' ? '#bfdbfe' : '#fed7aa' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: currentRide?.paymentMethod === 'wallet' ? '#2563eb' : '#ea580c' }}>
                                {currentRide?.paymentMethod === 'wallet' ? '💳 WALLET (NO CASH)' : '💵 CASH PAYMENT'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                <View style={styles.divider} />
                <View style={styles.actionsRow}>
                    {rideState !== 'trip_started' && (
                        <>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() =>
                                    router.push({ pathname: '/passenger-chat', params: { name: passengerName, rideId: currentRide?._id, photo: currentRide?.passengerId?.profilePicture || '' } })
                                }
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chatbubble-outline" size={22} color="#555" />
                                <Text style={styles.actionText}>Chat</Text>
                            </TouchableOpacity>
                            <View style={styles.actionDivider} />
                        </>
                    )}

                    {rideState !== 'arrived' && (
                        <>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={snapToCollapsed}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="navigate-outline" size={22} color={ACCENT} />
                                <Text style={[styles.actionText, { color: ACCENT }]}>Navigate</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {rideState !== 'trip_started' && (
                        <>
                            <View style={styles.actionDivider} />
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={handleCancelRide}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={24} color="#555" />
                                <Text style={styles.actionText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                    style={rideState === 'arrived' ? styles.pickupBtn : (rideState === 'pickup' ? styles.arrivedBtn : styles.dropOffBtn)}
                    activeOpacity={0.85}
                    onPress={handleActionPress}
                >
                    <Text style={rideState === 'arrived' ? styles.pickupText : (rideState === 'pickup' ? styles.arrivedText : styles.dropOffText)}>
                        {rideState === 'pickup' ? 'ARRIVED' : (rideState === 'arrived' ? 'PICK UP' : 'DROP OFF')}
                    </Text>
                </TouchableOpacity>

            </SafeAreaView>
        </Animated.View>
      )}

      {/* ── Discount Passenger Modal ───────────────────────────────── */}
      <DiscountPassengerModal
        visible={showDiscountModal}
        passengerCount={currentRide?.passengerCount}
        distanceKm={currentRide?.distanceKm}
        fareSettings={fareSettings}
        onConfirm={handleDiscountConfirm}
        onCancel={() => setShowDiscountModal(false)}
      />

      {/* ── Ride Cancelled Modal ─────────────────────────────────── */}
      <RideCancelledModal
        visible={showRideCancelledModal}
        reason={cancelledReason}
        onBackToHome={handleBackToHome}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee' },
  map: { ...StyleSheet.absoluteFillObject },
  earningsPill: {
    position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, gap: 6, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  earningsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  earningsBubble: {
    position: 'absolute', left: 16, zIndex: 10,
    flexDirection: 'column', alignItems: 'flex-start',
  },
  earningsCloseBtn: {
    backgroundColor: '#0F262D',
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  earningsBubbleContent: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    minWidth: 100,
  },
  earningsBubbleLabel: { fontSize: 11, color: '#888', marginBottom: 2, fontWeight: '500' },
  earningsBubbleAmount: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  queueBadge: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F262D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    gap: 8,
  },
  queueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  queueDotActive: {
    backgroundColor: '#22c55e',
  },
  queueDotDrift: {
    backgroundColor: '#eab308',
  },
  queueContent: {
    flexDirection: 'column',
  },
  queueTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  queueSub: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
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

  // Bottom Sheet Styles
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12,
  },
  sheetSafeContainer: { flex: 1, paddingHorizontal: 20, paddingBottom: 24 },
  handleArea: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#ccc' },
  row: { marginBottom: 6 },
  label: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 1 },
  value: { fontSize: 16, fontWeight: '700', color: '#222' },
  expandableContent: { overflow: 'hidden' },
  sheetTitle: { fontSize: 15, fontWeight: '600', color: '#444', marginTop: 4, marginBottom: 8, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 10 },
  locationBlock: { marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dotFilled: { width: 14, height: 14, borderRadius: 7, backgroundColor: ACCENT },
  dotOutline: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2.5, borderColor: ACCENT },
  locationTitle: { fontSize: 14, fontWeight: '700', color: ACCENT },
  locationAddress: { fontSize: 12.5, color: '#666', lineHeight: 19, paddingLeft: 22 },
  fareRow: { marginBottom: 4 },
  fareLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  fareValue: { fontSize: 18, fontWeight: '800', color: '#222' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, justifyContent: 'center' },
  actionBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 10 },
  actionText: { fontSize: 12, color: '#555', fontWeight: '500' },
  actionDivider: { width: 1, height: 36, backgroundColor: '#ebebeb' },

  arrivedBtn: { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 4 },
  arrivedText: { color: ACCENT, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  pickupBtn: { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 4 },
  pickupText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  dropOffBtn: { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 4 },
  dropOffText: { color: ACCENT, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  doneBtn: { backgroundColor: '#16a34a', borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 4 },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  emergencyFloatingBtn: {
    position: 'absolute', right: 16, zIndex: 20, backgroundColor: '#E53E3E',
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14, shadowColor: '#E53E3E',
    shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  emergencyFloatingTxt: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  // Summary Styles
  summaryContainer: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: ACCENT },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 3 },
  sectionValue: { fontSize: 16, fontWeight: '700', color: '#222' },
  infoTable: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500', textAlign: 'right' },
  confirmBtn: { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
