import {
    getDriverRegToken,
    setDriverRegImage,
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

const GREEN = '#22c55e';
const RED   = '#e53935';
const DARK  = '#1a4a3a';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Maps the (type, side) pair coming in from params to the store field name
const FIELD_MAP: Record<string, Record<string, keyof Parameters<typeof setDriverRegImage>[0] extends never ? any : any>> = {
  license:  { front: 'licenseImgFront', back: 'licenseImgBack' },
  selfie:   { selfie: 'faceImg',        holding: 'idImg' },
  orcr:     { or: 'tricycleOR',         cr: 'regCert' },
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

async function uploadToCloudinary(
  localUri: string,
  token: string,
): Promise<{ secure_url: string; public_id: string }> {
  // 1. Get signature from backend
  const sigRes = await fetch(`${API_URL}/driver-register/cloudinary-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!sigRes.ok) {
    const err = await sigRes.json();
    throw new Error(err.message || 'Failed to get upload signature.');
  }

  const { signature, timestamp, folder, tags, cloudName, apiKey } = await sigRes.json();

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
  const type   = params.type || 'license';
  const side   = params.side || 'front';

  const content   = CONTENT[type] ?? CONTENT.license;
  const fieldName = FIELD_MAP[type]?.[side];

  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (source: 'gallery' | 'camera') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photo library.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your camera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets[0]) return;

      const localUri = result.assets[0].uri;
      const token    = getDriverRegToken();

      if (!token) {
        Alert.alert('Session expired', 'Please restart the registration process.');
        return;
      }

      setUploading(true);

      const { secure_url, public_id } = await uploadToCloudinary(localUri, token);

      // Store URL and public ID in the registration store
      if (fieldName) {
        setDriverRegImage(fieldName, secure_url, public_id);
      }

      // Also pass the URL back via imageStore so the calling screen can display it
      setPendingImage(side, secure_url);
      router.back();

    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload Guidelines</Text>

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

        {!uploading && (
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

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={DARK} />
            <Text style={styles.uploadingText}>Uploading image...</Text>
          </View>
        )}
      </ScrollView>

      {!uploading && (
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
  container:           { flex: 1, backgroundColor: '#fff' },
  backBtn:             { paddingHorizontal: 16, paddingVertical: 12 },
  content:             { paddingHorizontal: 22, paddingBottom: 24 },
  title:               { fontSize: 26, fontWeight: '700', color: '#222', marginBottom: 28 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:        { fontSize: 16, fontWeight: '700', color: '#222' },
  bullet:              { fontSize: 13.5, color: '#444', lineHeight: 22, marginBottom: 4, paddingLeft: 4 },
  pickerBox:           { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, marginTop: 32, overflow: 'hidden', backgroundColor: '#fafafa' },
  pickerRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  pickerLabel:         { fontSize: 14, color: '#333', fontWeight: '500' },
  pickerDivider:       { height: 1, backgroundColor: '#e0e0e0' },
  uploadingContainer:  { alignItems: 'center', marginTop: 40, gap: 16 },
  uploadingText:       { fontSize: 14, color: '#666' },
  footer:              { paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  uploadBtn:           { backgroundColor: DARK, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  uploadBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});