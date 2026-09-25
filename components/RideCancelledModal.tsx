import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  reason?: string;
  onBackToHome: () => void;
}

export default function RideCancelledModal({ visible, reason, onBackToHome }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onBackToHome}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Alert Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="close-circle" size={36} color="#EF4444" />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Ride Cancelled</Text>
          <Text style={styles.subtitle}>
            The passenger has cancelled this ride request.
          </Text>

          {/* Cancellation Reason Box */}
          <View style={styles.reasonBox}>
            <View style={styles.reasonHeaderRow}>
              <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
              <Text style={styles.reasonLabel}>REASON FOR CANCELLATION</Text>
            </View>
            <Text style={styles.reasonText}>
              {reason || 'Change of plans'}
            </Text>
          </View>

          {/* Back to Home Button */}
          <TouchableOpacity
            style={styles.btn}
            activeOpacity={0.85}
            onPress={onBackToHome}
          >
            <Text style={styles.btnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    width: Math.min(W * 0.88, 360),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#FFF7F2',
    borderWidth: 1.5,
    borderColor: '#FFDDC9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },
  reasonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 0.6,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
  },
  btn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
