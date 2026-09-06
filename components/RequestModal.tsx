import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const ACCENT = Colors.light.tint;
const { width, height } = Dimensions.get('window');

interface RequestModalProps {
  ride: any;
  onAccept: (rideId: string) => void;
  onDecline: (rideId: string) => void;
  timeLeft: number;
}

export default function RequestModal({ ride, onAccept, onDecline, timeLeft }: RequestModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDecline = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onDecline(ride.rideId || ride._id));
  };

  const handleAccept = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onAccept(ride.rideId || ride._id));
  };

  if (!ride) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>New Ride Request</Text>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={16} color="#d32f2f" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color={ACCENT} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationValue} numberOfLines={2}>{ride.pickup?.address}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.locationRow}>
            <Ionicons name="flag" size={20} color={ACCENT} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>DROP-OFF</Text>
              <Text style={styles.locationValue} numberOfLines={2}>{ride.dropoff?.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{ride.distanceKm} km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Est. Fare</Text>
            <Text style={styles.statValue}>₱{Number(ride.fare ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline} activeOpacity={0.8}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  timerText: {
    color: '#d32f2f',
    fontWeight: '700',
    fontSize: 14,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
    marginLeft: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  declineText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '700',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    elevation: 4,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
