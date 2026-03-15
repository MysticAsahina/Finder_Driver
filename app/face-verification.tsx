import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { getAndClearPendingImage } from '@/store/imageStore';

const ACCENT = Colors.light.tint;

export default function FaceVerificationScreen() {
    const router = useRouter();
    const [selfieImage, setSelfieImage] = useState<string | null>(null);
    const [holdingImage, setHoldingImage] = useState<string | null>(null);

    // Pick up image when returning from upload-guidelines
    useFocusEffect(
        React.useCallback(() => {
            const pending = getAndClearPendingImage();
            if (pending) {
                if (pending.side === 'selfie') setSelfieImage(pending.uri);
                else if (pending.side === 'holding') setHoldingImage(pending.uri);
            }
        }, [])
    );

    const openGuidelines = (side: 'selfie' | 'holding') => {
        router.push({ pathname: '/upload-guidelines', params: { type: 'selfie', side } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.pageTitle}>Face Verification</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>Please provide a selfie and a photo holding your license.</Text>

                {/* Upload Selfie */}
                <View style={styles.uploadRow}>
                    <Text style={styles.uploadLabel}>
                        Face Selfie <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('selfie')} activeOpacity={0.7}>
                        {selfieImage ? (
                            <>
                                <Image source={{ uri: selfieImage }} style={styles.previewImage} resizeMode="cover" />
                                <View style={styles.editBadge}>
                                    <Text style={styles.editIcon}>✎</Text>
                                </View>
                            </>
                        ) : (
                            <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Upload Holding License */}
                <View style={styles.uploadRow}>
                    <Text style={styles.uploadLabel}>
                        Holding License <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('holding')} activeOpacity={0.7}>
                        {holdingImage ? (
                            <>
                                <Image source={{ uri: holdingImage }} style={styles.previewImage} resizeMode="cover" />
                                <View style={styles.editBadge}>
                                    <Text style={styles.editIcon}>✎</Text>
                                </View>
                            </>
                        ) : (
                            <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={() => router.push('/vehicle-registration')} activeOpacity={0.85}>
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
    uploadBox: {
        width: 110, height: 100, borderWidth: 1.5, borderColor: '#ddd',
        borderRadius: 12, borderStyle: 'dashed', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#fafafa',
        overflow: 'hidden',
    },
    previewImage: { width: '100%', height: '100%', borderRadius: 10 },
    editBadge: {
        position: 'absolute', bottom: 4, right: 4,
        backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
        paddingHorizontal: 5, paddingVertical: 2,
    },
    editIcon: { color: '#fff', fontSize: 11 },
    plusIcon: { fontSize: 28, color: '#555', fontWeight: '300' },
    uploadText: { fontSize: 11, color: '#888', marginTop: 4 },
    uploadDone: { fontSize: 28, color: ACCENT, fontWeight: '700' },
    nextButton: { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
    nextText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});
