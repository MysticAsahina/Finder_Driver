import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;
const ONLINE_GREEN = '#22c55e';

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const insets = useSafeAreaInsets();
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSystemActiveToast = () => {
    // Fade in
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setShowToast(true);

    // Clear any existing timer
    if (toastTimer.current) clearTimeout(toastTimer.current);

    // Fade out after 5s
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowToast(false));
    }, 2000);
  };

  const handleToggle = () => {
    const goingOnline = !isOnline;
    setIsOnline(goingOnline);
    if (goingOnline) showSystemActiveToast();
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 15.4748,
          longitude: 120.9640,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      />

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

        {/* Online + toast gone: just the green circle stays, no extra button */}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  earningsPill: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a5a4a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  earningsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Power circle (offline = dark, online = green)
  powerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  powerCircleOnline: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Toast pill
  toastPill: {
    flex: 1,
    backgroundColor: ONLINE_GREEN,
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Go Online pill (when offline)
  goOnlineButton: {
    flex: 1,
    backgroundColor: '#555',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  goOnlineText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Go Offline pill (when online, toast gone)
  goOfflineButton: {
    flex: 1,
    backgroundColor: '#d32f2f',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  goOfflineText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

