/**
 * DiscountPassengerModal
 * Shows when driver presses "ARRIVED" so they can verify
 * how many passengers have a student/PWD/senior ID (max 3).
 * Fare breakdown is calculated and shown live before confirming.
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ACCENT, ACCENT_LIGHT, BORDER, TEXT_DARK, TEXT_SOFT, TEXT_HINT } from '@/constants/theme';

// ── Fare config ────────────────────────────────────────────────────────────
const BASE_FARE = 35;
const PER_KM_FARE = 5;
const BASE_DISTANCE = 3;
const MAX_CAPACITY = 3;

interface Props {
  visible: boolean;
  passengerCount?: number;
  distanceKm?: number;
  onConfirm: (discountedCount: number, updatedFare: number) => void;
  onCancel: () => void;
}

export default function DiscountPassengerModal({ visible, passengerCount = 1, distanceKm = 0, onConfirm, onCancel }: Props) {
  const [discounted, setDiscounted] = useState(0);

  const pCount = Math.min(MAX_CAPACITY, passengerCount);
  const dCount = Math.min(pCount, discounted);
  const regularCount = pCount - dCount;
  const extraKm = Math.max(0, Math.ceil(distanceKm - BASE_DISTANCE));
  const effectiveBaseFare = pCount === 1 ? BASE_FARE * 2 : BASE_FARE;
  const regularFarePerPerson = effectiveBaseFare + (extraKm * PER_KM_FARE);
  const discountedFarePerPerson = (effectiveBaseFare * 0.8) + (extraKm * PER_KM_FARE * 0.8);
  
  const regularAmt = regularCount * regularFarePerPerson;
  const discountAmt = dCount * discountedFarePerPerson;
  const totalFare = regularAmt + discountAmt;

  const decrement = () => setDiscounted(d => Math.max(0, d - 1));
  const increment = () => setDiscounted(d => Math.min(pCount, d + 1));

  const handleConfirm = () => {
    onConfirm(discounted, totalFare);
    setDiscounted(0);
  };

  const handleCancel = () => {
    setDiscounted(0);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel}>
        {/* Card — stop touch propagation */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.card}>

          {/* ── Drag pill ─────────────────────────────────────────────── */}
          <View style={styles.pill} />

          {/* ── Title row ─────────────────────────────────────────────── */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Passenger with Discount</Text>
              <Text style={styles.subtitle}>Student / Senior / PWD ID • Max {pCount}</Text>
            </View>

            {/* Counter */}
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={decrement}
                style={[styles.counterBtn, discounted === 0 && styles.counterBtnDisabled]}
                activeOpacity={0.75}
                disabled={discounted === 0}
              >
                <Text style={[styles.counterBtnText, discounted === 0 && styles.counterBtnTextDisabled]}>−</Text>
              </TouchableOpacity>

              <Text style={styles.counterValue}>{discounted}</Text>

              <TouchableOpacity
                onPress={increment}
                style={[styles.counterBtn, discounted >= pCount && styles.counterBtnDisabled]}
                activeOpacity={0.75}
                disabled={discounted >= pCount}
              >
                <Text style={[styles.counterBtnText, discounted >= pCount && styles.counterBtnTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Fare breakdown card ───────────────────────────────────── */}
          <View style={styles.fareCard}>
            {/* Regular row */}
            <View style={styles.fareRow}>
              <Text style={styles.fareRowLabel}>
                Regular passengers{' '}
                <Text style={styles.fareFormula}>( {regularCount} × ₱{regularFarePerPerson.toFixed(2)} )</Text>
              </Text>
              <Text style={styles.fareRowAmt}>₱ {regularAmt.toFixed(2)}</Text>
            </View>

            {/* Discounted row */}
            <View style={styles.fareRow}>
              <Text style={styles.fareRowLabel}>
                Discounted passenger{discounted !== 1 ? 's' : ''}{' '}
                <Text style={styles.fareFormula}>( {dCount} × ₱{discountedFarePerPerson.toFixed(2)} )</Text>
              </Text>
              <Text style={[styles.fareRowAmt, { color: ACCENT }]}>₱ {discountAmt.toFixed(2)}</Text>
            </View>

            <View style={styles.fareDivider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Updated Fare</Text>
                <Text style={styles.totalSub}>All discounts verified</Text>
              </View>
              <Text style={styles.totalAmt}>₱ {totalFare.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── Confirm button ────────────────────────────────────────── */}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>

          {/* ── Cancel link ───────────────────────────────────────────── */}
          <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Skip — no discounts</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },

  // drag pill
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 20,
  },

  // title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    color: TEXT_HINT,
    marginTop: 3,
    fontWeight: '500',
  },

  // counter
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#e0e0e0',
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
  },
  counterBtnTextDisabled: {
    color: '#aaa',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_DARK,
    minWidth: 26,
    textAlign: 'center',
  },

  // fare breakdown card
  fareCard: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareRowLabel: {
    fontSize: 13,
    color: TEXT_SOFT,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  fareFormula: {
    color: TEXT_HINT,
    fontSize: 12,
    fontWeight: '400',
  },
  fareRowAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginLeft: 12,
  },
  fareDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  totalSub: {
    fontSize: 10.5,
    color: TEXT_HINT,
    marginTop: 1,
  },
  totalAmt: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },

  // confirm
  confirmBtn: {
    backgroundColor: ACCENT,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // cancel
  cancelLink: {
    alignItems: 'center',
    marginTop: 14,
  },
  cancelText: {
    fontSize: 13,
    color: TEXT_HINT,
    fontWeight: '500',
  },
});
