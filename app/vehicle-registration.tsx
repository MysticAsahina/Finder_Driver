import { Colors } from '@/constants/theme';
import { getAndClearPendingImage } from '@/store/imageStore';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = Colors.light.tint;

import { getDriverRegStore } from '@/store/driverRegistrationStore';

export default function VehicleRegistrationScreen() {
  const router = useRouter();
  const store = getDriverRegStore();
  const [orImage, setOrImage] = useState<string | null>(store.tricycleOR);
  const [crImage, setCrImage] = useState<string | null>(store.regCert);
  const [error,   setError]   = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const pending = getAndClearPendingImage();
      if (pending) {
        if (pending.side === 'or') setOrImage(pending.uri);
        else if (pending.side === 'cr') setCrImage(pending.uri);
      }
    }, [])
  );

  const openGuidelines = (side: 'or' | 'cr') => {
    router.push({ pathname: '/upload-guidelines', params: { type: 'orcr', side } });
  };

  const handleNext = () => {
    setError(null);
    if (!orImage) return setError('Please upload the Official Receipt (OR).');
    if (!crImage) return setError('Please upload the Certificate of Registration (CR).');
    // Images are already stored in driverRegistrationStore via upload-guidelines
    router.push('/tricycle-details');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Vehicle Registration</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Please provide the OR and CR of your tricycle.</Text>

        <View style={styles.uploadRow}>
          <Text style={styles.uploadLabel}>Official Receipt{'\n'}(OR) <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('or')} activeOpacity={0.7}>
            {orImage ? (
              <>
                <Image source={{ uri: orImage }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.editBadge}><Text style={styles.editIcon}>✎</Text></View>
              </>
            ) : (
              <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.uploadRow}>
          <Text style={styles.uploadLabel}>Certificate of{'\n'}Registration (CR) <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('cr')} activeOpacity={0.7}>
            {crImage ? (
              <>
                <Image source={{ uri: crImage }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.editBadge}><Text style={styles.editIcon}>✎</Text></View>
              </>
            ) : (
              <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>NEXT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  pageTitle:     { fontSize: 28, fontWeight: '700', color: ACCENT, marginBottom: 6 },
  divider:       { height: 2.5, backgroundColor: ACCENT, marginBottom: 24, borderRadius: 2 },
  subtitle:      { fontSize: 18, fontWeight: '600', color: ACCENT, marginBottom: 28, lineHeight: 26 },
  uploadRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  uploadLabel:   { fontSize: 15, fontWeight: '600', color: '#333', lineHeight: 22 },
  required:      { color: '#e53935', fontWeight: '700' },
  uploadBox:     { width: 110, height: 100, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', overflow: 'hidden' },
  previewImage:  { width: '100%', height: '100%', borderRadius: 10 },
  editBadge:     { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  editIcon:      { color: '#fff', fontSize: 11 },
  plusIcon:      { fontSize: 28, color: '#555', fontWeight: '300' },
  uploadText:    { fontSize: 11, color: '#888', marginTop: 4 },
  errorText:     { fontSize: 13, color: '#e53935', marginBottom: 16 },
  nextButton:    { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  nextText:      { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});