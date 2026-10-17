import { Colors } from '@/constants/theme';
import { setDriverRegLicense, getDriverRegStore } from '@/store/driverRegistrationStore';
import { getAndClearPendingImage } from '@/store/imageStore';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ACCENT = Colors.light.tint;
const LICENSE_NUMBER_REGEX = /^[A-Z]\d{2}-\d{2}-\d{6}$/;
const OCR_DIGIT_CORRECTIONS: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  B: '8',
};

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function normalizeLicenseNumber(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.length !== 11) {
    return value.toUpperCase().trim();
  }

  const firstCharacter = cleaned.charAt(0);
  const digits = cleaned
    .slice(1)
    .split('')
    .map((char) => OCR_DIGIT_CORRECTIONS[char] ?? char)
    .join('');

  if (!/^[A-Z]$/.test(firstCharacter) || !/^\d{10}$/.test(digits)) {
    return value.toUpperCase().trim();
  }

  return `${firstCharacter}${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function validateLicenseNumber(value: string): string | null {
  if (!value.trim()) return 'License number is required.';
  if (!LICENSE_NUMBER_REGEX.test(value.trim())) {
    return 'License number must match A00-00-000000.';
  }
  return null;
}

function parseYmdDate(value?: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
}

function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toUtcDateISOString(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export default function DrivingLicenseScreen() {
  const router = useRouter();
  const store = getDriverRegStore();
  const [frontImage, setFrontImage] = useState<string | null>(store.licenseImgFront);
  const [backImage, setBackImage] = useState<string | null>(store.licenseImgBack);
  const [licenseNumber, setLicenseNumber] = useState(store.licenseNumber || '');
  const [expirationDate, setExpirationDate] = useState<Date | null>(store.licenseExpDate ? new Date(store.licenseExpDate) : null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const currentStore = getDriverRegStore();
      if (currentStore.licenseImgFront) {
        setFrontImage((prev) => prev || currentStore.licenseImgFront);
      }
      if (currentStore.licenseImgBack) {
        setBackImage((prev) => prev || currentStore.licenseImgBack);
      }
      if (currentStore.licenseNumber) {
        setLicenseNumber((prev) => prev || currentStore.licenseNumber);
      }
      if (currentStore.licenseExpDate) {
        setExpirationDate((prev) => prev || (currentStore.licenseExpDate ? new Date(currentStore.licenseExpDate) : null));
      }

      const pending = getAndClearPendingImage();
      if (pending) {
        if (pending.side === 'front') {
          setFrontImage(pending.uri);

          if (pending.ocrData?.licenseNumber) {
            setLicenseNumber(pending.ocrData.licenseNumber);
          }

          if (pending.ocrData?.expirationDateYmd) {
            const parsedDate = parseYmdDate(pending.ocrData.expirationDateYmd);
            if (parsedDate) {
              setExpirationDate(parsedDate);
            }
          }
        } else {
          setBackImage(pending.uri);
        }

        setError(null);
      }
    }, [])
  );

  const openGuidelines = (side: 'front' | 'back') => {
    router.push({ pathname: '/upload-guidelines', params: { type: 'license', side } });
  };

  const handleNext = () => {
    setError(null);

    if (!frontImage) return setError('Please upload the front of your driving license.');
    if (!backImage) return setError('Please upload the back of your driving license.');

    const normalizedLicenseNumber = normalizeLicenseNumber(licenseNumber);
    const licErr = validateLicenseNumber(normalizedLicenseNumber);
    if (licErr) return setError(licErr);

    if (normalizedLicenseNumber !== licenseNumber) {
      setLicenseNumber(normalizedLicenseNumber);
    }

    if (!expirationDate) return setError('Expiration date is required.');
    if (expirationDate < getStartOfToday()) {
      return setError('License expiration date must be today or in the future.');
    }

    setDriverRegLicense({
      licenseNumber: normalizedLicenseNumber,
      licenseExpDate: toUtcDateISOString(expirationDate),
    });

    router.push('/face-verification');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
      >
        <Text style={styles.pageTitle}>Driving License</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Please provide your details for verification.</Text>

        <View style={styles.uploadRow}>
          <Text style={styles.uploadLabel}>Driving License{'\n'}(Front) <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('front')} activeOpacity={0.7}>
            {frontImage ? (
              <>
                <Image source={{ uri: frontImage }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.editBadge}><Text style={styles.editIcon}>✎</Text></View>
              </>
            ) : (
              <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.uploadRow}>
          <Text style={styles.uploadLabel}>Driving License{'\n'}(Back) <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('back')} activeOpacity={0.7}>
            {backImage ? (
              <>
                <Image source={{ uri: backImage }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.editBadge}><Text style={styles.editIcon}>✎</Text></View>
              </>
            ) : (
              <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>License number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={(text) => { setError(null); setLicenseNumber(text.toUpperCase()); }}
          placeholder="A00-00-000000"
          placeholderTextColor="#999"
          maxLength={20}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>
          Expiration date <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => { setError(null); setShowPicker(true); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateButtonText, !expirationDate && styles.dateButtonPlaceholder]}>
            {expirationDate ? formatDate(expirationDate) : 'Select date'}
          </Text>
        </TouchableOpacity>

        {/* Android: picker shows as dialog directly */}
        {Platform.OS === 'android' && showPicker && (
          <DateTimePicker
            value={expirationDate ?? new Date()}
            mode="date"
            display="default"
            minimumDate={getStartOfToday()}
            onChange={(event: DateTimePickerEvent, selected?: Date) => {
              setShowPicker(false);
              if (event.type === 'set' && selected) {
                setExpirationDate(selected);
              }
            }}
          />
        )}

        {/* iOS: picker shown inside a modal */}
        {Platform.OS === 'ios' && (
          <Modal visible={showPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <DateTimePicker
                  value={expirationDate ?? new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={getStartOfToday()}
                  onChange={(_: DateTimePickerEvent, selected?: Date) => {
                    if (selected) setExpirationDate(selected);
                  }}
                  style={styles.iOSPicker}
                />
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setShowPicker(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>NEXT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: ACCENT, marginBottom: 6 },
  divider: { height: 2.5, backgroundColor: ACCENT, marginBottom: 24, borderRadius: 2 },
  subtitle: { fontSize: 18, fontWeight: '600', color: ACCENT, marginBottom: 28, lineHeight: 26 },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: '#333', lineHeight: 22 },
  required: { color: '#e53935', fontWeight: '700' },
  uploadBox: { width: 110, height: 100, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', borderRadius: 10 },
  editBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  editIcon: { color: '#fff', fontSize: 11 },
  plusIcon: { fontSize: 28, color: '#555', fontWeight: '300' },
  uploadText: { fontSize: 11, color: '#888', marginTop: 4 },
  fieldLabel: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
  fieldHint: { fontSize: 12, color: '#aaa', fontWeight: '400' },
  input: { borderWidth: 0, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 15, color: '#222', backgroundColor: '#f0f0f0', marginBottom: 20 },
  errorText: { fontSize: 13, color: '#e53935', marginBottom: 16 },
  nextButton: { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  dateButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#f0f0f0', marginBottom: 20 },
  dateButtonText: { fontSize: 15, color: '#222' },
  dateButtonPlaceholder: { color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 12, paddingHorizontal: 24 },
  iOSPicker: { width: '100%' },
  doneBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
