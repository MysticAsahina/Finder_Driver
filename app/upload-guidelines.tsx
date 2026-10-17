import {
  getDriverRegToken,
  setDriverRegImage,
  setCapturingCamera,
} from '@/store/driverRegistrationStore';
import { setPendingImage } from '@/store/imageStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/utils/axios';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import SelfieGuideIllustration from '@/components/SelfieGuideIllustration';

const GREEN = '#22c55e';
const RED = '#e53935';
const DARK = '#1a4a3a';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const LICENSE_NUMBER_REGEX = /^[A-Z]\d{2}-\d{2}-\d{6}$/;
const LICENSE_NUMBER_CANDIDATE_REGEX =
  /\b([A-Z][A-Z0-9OISBZDLQ]{2}[\s\-/.]*[A-Z0-9OISBZDLQ]{2}[\s\-/.]*[A-Z0-9OISBZDLQ]{6})\b/g;
const DATE_CANDIDATE_REGEX =
  /\b([0-9OISBZDLQ]{4})[\/\.\-\s]+([0-9OISBZDLQ]{1,2})[\/\.\-\s]+([0-9OISBZDLQ]{1,2})\b/g;
const LICENSE_LABEL_REGEX = /\b(?:LIC(?:EN[CS]E)?|DL|NO\.?|NUMBER)\b/i;
const EXPIRY_LABEL_REGEX = /\b(?:EXP(?:IRY|IRATION)?|VALID(?:ITY)?|UNTIL)\b/i;
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

interface MlKitTextLine {
  text?: string;
}

interface MlKitTextBlock {
  text?: string;
  lines?: MlKitTextLine[];
}

interface MlKitTextRecognitionResult {
  text?: string;
  blocks?: MlKitTextBlock[];
}

interface ExtractedLicenseData {
  licenseNumber?: string;
  expirationDateYmd?: string;
}

type UploadPhase = 'idle' | 'recognizing' | 'uploading';

class LicenseRecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LicenseRecognitionError';
  }
}

// Maps the (type, side) pair coming in from params to the store field name
const FIELD_MAP: Record<string, Record<string, keyof Parameters<typeof setDriverRegImage>[0] extends never ? any : any>> = {
  license: { front: 'licenseImgFront', back: 'licenseImgBack' },
  selfie: { selfie: 'faceImg', holding: 'idImg' },
  orcr: { or: 'tricycleOR', cr: 'regCert' },
  tricycle: { front: 'tricycleImgFront', back: 'tricycleImgBack' },
};

const CONTENT: Record<string, { requirements: string[]; avoid: string[] }> = {
  license: {
    requirements: [
      "Upload clear photos of the front and back of your original driver's license",
      'Photos must be taken directly from the original document',
      'License must be valid and not expired',
      'All details must be clearly visible and readable',
    ],
    avoid: [
      'Expired or invalid documents',
      'Photocopies or scanned copies',
      'Edited, retouched, or filtered images',
      'Blurry, dark, or overexposed photos',
      'Documents with important information cut off from the frame',
    ],
  },
  tricycle: {
    requirements: [
      'Upload clear photos of the front and back of your tricycle',
      'The full vehicle must be visible including the sidecar',
      'Photos must be taken in a well-lit area with a plain background if possible',
      'The plate number must be clearly visible and readable',
      'All stickers, permits, or registration markings must be visible',
    ],
    avoid: [
      'Cropped or partial photos of the vehicle',
      'Photos taken at night or in poor lighting',
      'Edited, retouched, or filtered images',
      'Blurry, shaky, or overexposed shots',
      'Photos of other vehicles or unrelated objects',
      'Covering the plate number or any identifying markings',
    ],
  },
  selfie: {
    requirements: [
      'Take a clear selfie showing your full face',
      'For the second photo, hold your license next to your face',
      'Ensure the room is well-lit and your face is fully visible',
      'Make sure the details on the license are readable when holding it',
    ],
    avoid: [
      'Wearing sunglasses or hats that cover your face',
      'Blurry or dark photos',
      'Using filters or edited images',
      'Covering your face with the license',
    ],
  },
  orcr: {
    requirements: [
      'Upload a clear photo of your Official Receipt (OR) and Certificate of Registration (CR)',
      'The text must be completely readable and not cut off',
      'Make sure the document is well-lit and not blurry',
      'Ensure the document is valid and up-to-date',
    ],
    avoid: [
      'Blurry, dark, or unreadable photos',
      'Covering any text or details on the document',
      'Using poor quality photocopies',
      'Cropped or partial photos of the document',
    ],
  },
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeOcrDigit(value: string): string {
  return OCR_DIGIT_CORRECTIONS[value] ?? value;
}

function normalizeLicenseCandidate(candidate: string): string | null {
  const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length !== 11) return null;

  const firstCharacter = cleaned.charAt(0);
  if (!/^[A-Z]$/.test(firstCharacter)) return null;

  const digits = cleaned
    .slice(1)
    .split('')
    .map(normalizeOcrDigit)
    .join('');

  if (!/^\d{10}$/.test(digits)) return null;

  const normalized = `${firstCharacter}${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  return LICENSE_NUMBER_REGEX.test(normalized) ? normalized : null;
}

function normalizeDateCandidate(yearPart: string, monthPart: string, dayPart: string): string | null {
  const year = yearPart
    .toUpperCase()
    .split('')
    .map(normalizeOcrDigit)
    .join('');
  const month = monthPart
    .toUpperCase()
    .split('')
    .map(normalizeOcrDigit)
    .join('');
  const day = dayPart
    .toUpperCase()
    .split('')
    .map(normalizeOcrDigit)
    .join('');

  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return null;
  }

  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  const parsed = new Date(yyyy, mm - 1, dd);

  if (
    parsed.getFullYear() !== yyyy ||
    parsed.getMonth() !== mm - 1 ||
    parsed.getDate() !== dd
  ) {
    return null;
  }

  return `${yyyy}/${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
}

function parseYmdToDate(value: string): Date | null {
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

function collectUnique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function buildOcrLines(result: MlKitTextRecognitionResult): string[] {
  const blockLines =
    result.blocks
      ?.flatMap((block) =>
        block.lines
          ?.map((line) => compactWhitespace(line.text ?? ''))
          .filter(Boolean) ?? []
      )
      .filter(Boolean) ?? [];

  const textLines = (result.text ?? '')
    .split(/\r?\n/)
    .map((line) => compactWhitespace(line))
    .filter(Boolean);

  return collectUnique([...blockLines, ...textLines]);
}

function buildKeywordWindows(lines: string[], keywordRegex: RegExp): string[] {
  const windows: string[] = [];

  lines.forEach((line, index) => {
    if (keywordRegex.test(line)) {
      windows.push(
        [line, lines[index + 1], lines[index + 2]]
          .filter(Boolean)
          .join(' ')
      );
    }
  });

  return windows;
}

function collectLicenseMatches(source: string): string[] {
  return Array.from(source.toUpperCase().matchAll(LICENSE_NUMBER_CANDIDATE_REGEX)).map(
    (match) => match[1]
  );
}

function collectDateMatches(source: string): string[] {
  return Array.from(source.toUpperCase().matchAll(DATE_CANDIDATE_REGEX))
    .map((match) => normalizeDateCandidate(match[1], match[2], match[3]))
    .filter((value): value is string => Boolean(value));
}

function extractLicenseNumber(lines: string[], fullText: string): string | null {
  const sources = collectUnique([
    ...buildKeywordWindows(lines, LICENSE_LABEL_REGEX),
    ...lines,
    fullText,
  ]);

  for (const source of sources) {
    const matches = collectLicenseMatches(source);

    for (const match of matches) {
      const normalized = normalizeLicenseCandidate(match);
      if (normalized) return normalized;
    }
  }

  return null;
}

function pickBestExpirationDate(candidates: string[]): string | null {
  const today = getStartOfToday();
  const upperBound = new Date(today.getFullYear() + 20, today.getMonth(), today.getDate());

  const futureDates = collectUnique(candidates)
    .map((ymd) => ({ ymd, date: parseYmdToDate(ymd) }))
    .filter((item): item is { ymd: string; date: Date } => Boolean(item.date))
    .filter((item) => item.date >= today && item.date <= upperBound)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return futureDates[0]?.ymd ?? null;
}

function extractExpirationDate(lines: string[], fullText: string): string | null {
  const prioritizedSources = collectUnique([
    ...buildKeywordWindows(lines, EXPIRY_LABEL_REGEX),
    fullText,
  ]);

  const prioritizedCandidates = prioritizedSources.flatMap((source) => collectDateMatches(source));
  const prioritizedResult = pickBestExpirationDate(prioritizedCandidates);
  if (prioritizedResult) return prioritizedResult;

  const fallbackCandidates = collectUnique([
    ...lines.flatMap((line) => collectDateMatches(line)),
    ...collectDateMatches(fullText),
  ]);

  return pickBestExpirationDate(fallbackCandidates);
}

const OCR_MAX_DIMENSION = 1600;

async function prepareImageForOcr(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: OCR_MAX_DIMENSION } }],
      { compress: 0.85, format: SaveFormat.JPEG },
    );
    return result.uri;
  } catch (err) {
    console.warn('Image resize failed, using original uri:', err);
    return uri;
  }
}

async function recognizeLicenseDetails(localUri: string): Promise<ExtractedLicenseData> {
  let TextRecognitionModule: { recognize: (imageUri: string) => Promise<MlKitTextRecognitionResult> };

  try {
    const importedModule = await import('@react-native-ml-kit/text-recognition');
    TextRecognitionModule = importedModule.default;
  } catch {
    throw new LicenseRecognitionError(
      'Text recognition is unavailable in this build. Please install the package and run the app in a development build.'
    );
  }

  let result: MlKitTextRecognitionResult;

  try {
    result = await TextRecognitionModule.recognize(localUri);
  } catch {
    throw new LicenseRecognitionError(
      'We could not scan this image. Please retake the front of your license with sharper focus and better lighting.'
    );
  }

  const lines = buildOcrLines(result);
  const fullText = compactWhitespace([result.text ?? '', ...lines].join('\n')).toUpperCase();

  const licenseNumber = extractLicenseNumber(lines, fullText);
  const expirationDateYmd = extractExpirationDate(lines, fullText);

  if (!licenseNumber && !expirationDateYmd) {
    throw new LicenseRecognitionError(
      "We couldn't read your license number and expiration date."
    );
  }

  return {
    licenseNumber: licenseNumber ?? undefined,
    expirationDateYmd: expirationDateYmd ?? undefined,
  };
}

async function uploadToCloudinary(
  localUri: string,
  token: string,
): Promise<{ secure_url: string; public_id: string }> {
  // 1. Get signature from backend
  const sigRes = await api.post('/driver-register/cloudinary-signature', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const { signature, timestamp, folder, tags, cloudName, apiKey } = sigRes.data;

  // 2. Upload directly to Cloudinary
  const formData = new FormData();
  formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'upload.jpg' } as any);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('tags', tags);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!uploadRes.ok) {
    throw new Error('Image upload failed. Please try again.');
  }

  const uploadData = await uploadRes.json();
  return { secure_url: uploadData.secure_url, public_id: uploadData.public_id };
}

export default function UploadGuidelinesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; side?: string }>();
  const type = params.type || 'license';
  const side = params.side || 'front';

  const content = CONTENT[type] ?? CONTENT.license;
  const fieldName = FIELD_MAP[type]?.[side];
  const isLicenseFront = type === 'license' && side === 'front';

  const [phase, setPhase] = useState<UploadPhase>('idle');

  const isBusy = phase !== 'idle';
  const statusText = phase === 'recognizing' ? 'Reading license details...' : 'Uploading image...';

  const pickAndUpload = async (source: 'gallery' | 'camera') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      const pickerQuality = 0.8;
      await setCapturingCamera(true);

      if (source === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photo library.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: pickerQuality,
        });
      } else {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your camera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: pickerQuality,
        });
      }

      if (result.canceled || !result.assets[0]) return;

      const localUri = result.assets[0].uri;
      const token = getDriverRegToken();

      if (!token) {
        Alert.alert('Session expired', 'Please restart the registration process.');
        return;
      }

      let extractedLicenseData: ExtractedLicenseData | undefined;
      let ocrNotice: string | null = null;

      setPhase(isLicenseFront ? 'recognizing' : 'uploading');

      let uploadUri = localUri;
      
      if (isLicenseFront) {
        uploadUri = await prepareImageForOcr(localUri);
        try {
          extractedLicenseData = await recognizeLicenseDetails(uploadUri);
          if (!extractedLicenseData.licenseNumber || !extractedLicenseData.expirationDateYmd) {
            ocrNotice = 'Photo uploaded, but some license details could not be auto-detected. Please verify or complete them manually.';
          }
        } catch (ocrErr: any) {
          ocrNotice = 'Photo uploaded successfully. We could not auto-detect your license details, so please enter your license number and expiry date manually.';
          console.warn('OCR non-fatal failure:', ocrErr?.message);
        }
      } else {
        // Aggressively compress all other images before upload to prevent FormData OOM crashes
        uploadUri = await prepareImageForOcr(localUri);
      }

      setPhase('uploading');

      const { secure_url, public_id } = await uploadToCloudinary(uploadUri, token);

      // Store URL and public ID in the registration store.
      if (fieldName) {
        setDriverRegImage(fieldName, secure_url, public_id);
      }

      // Also pass the URL and OCR data back via imageStore so the calling screen can display it.
      setPendingImage(
        side,
        secure_url,
        extractedLicenseData
          ? {
              licenseNumber: extractedLicenseData.licenseNumber,
              expirationDateYmd: extractedLicenseData.expirationDateYmd,
            }
          : undefined,
      );
      router.back();

      if (ocrNotice) {
        setTimeout(() => {
          Alert.alert('Manual Verification', ocrNotice!);
        }, 350);
      }
    } catch (err: any) {
      if (err instanceof LicenseRecognitionError) {
        Alert.alert('Could not read license', err.message);
      } else {
        Alert.alert('Upload failed', err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setCapturingCamera(false).catch(() => {});
      setPhase('idle');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload Guidelines</Text>

        {type === 'selfie' && (
          <SelfieGuideIllustration side={side as 'selfie' | 'holding'} />
        )}

        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle" size={22} color={GREEN} />
          <Text style={styles.sectionTitle}>Requirements</Text>
        </View>
        {content.requirements.map((item, i) => (
          <Text key={i} style={styles.bullet}>• {item}</Text>
        ))}

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Ionicons name="close-circle" size={22} color={RED} />
          <Text style={styles.sectionTitle}>Things to avoid</Text>
        </View>
        {content.avoid.map((item, i) => (
          <Text key={i} style={styles.bullet}>• {item}</Text>
        ))}

        {!isBusy && (
          <View style={styles.pickerBox}>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => pickAndUpload('gallery')}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerLabel}>Image</Text>
              <Ionicons name="image-outline" size={22} color="#555" />
            </TouchableOpacity>
            <View style={styles.pickerDivider} />
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => pickAndUpload('camera')}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerLabel}>Camera</Text>
              <Ionicons name="camera-outline" size={22} color="#555" />
            </TouchableOpacity>
          </View>
        )}

        {isBusy && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={DARK} />
            <Text style={styles.uploadingText}>{statusText}</Text>
          </View>
        )}
      </ScrollView>

      {!isBusy && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => pickAndUpload('gallery')}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadBtnText}>UPLOAD</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  content: { paddingHorizontal: 22, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#222', marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  bullet: { fontSize: 13.5, color: '#444', lineHeight: 22, marginBottom: 4, paddingLeft: 4 },
  pickerBox: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, marginTop: 32, overflow: 'hidden', backgroundColor: '#fafafa' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  pickerLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  pickerDivider: { height: 1, backgroundColor: '#e0e0e0' },
  uploadingContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  uploadingText: { fontSize: 14, color: '#666' },
  footer: { paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  uploadBtn: { backgroundColor: DARK, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});
