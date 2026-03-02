import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
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

export default function TricycleDetailsScreen() {
    const router = useRouter();
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [brandModel, setBrandModel] = useState('');
    const [plateNumber, setPlateNumber] = useState('');

    // Pick up image when returning from upload-guidelines
    useFocusEffect(
        React.useCallback(() => {
            const pending = getAndClearPendingImage();
            if (pending) {
                if (pending.side === 'front') setFrontImage(pending.uri);
                else setBackImage(pending.uri);
            }
        }, [])
    );

    const openGuidelines = (side: 'front' | 'back') => {
        router.push({ pathname: '/upload-guidelines', params: { type: 'tricycle', side } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.pageTitle}>Tricycle Details</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>Please provide your details for verification.</Text>

                {/* Upload Front */}
                <View style={styles.uploadRow}>
                    <Text style={styles.uploadLabel}>
                        Tricycle{'\n'}(Front) <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('front')} activeOpacity={0.7}>
                        {frontImage ? (
                            <>
                                <Image source={{ uri: frontImage }} style={styles.previewImage} resizeMode="cover" />
                                <View style={styles.editBadge}>
                                    <Text style={styles.editIcon}>✎</Text>
                                </View>
                            </>
                        ) : (
                            <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Upload Back */}
                <View style={styles.uploadRow}>
                    <Text style={styles.uploadLabel}>
                        Tricycle{'\n'}(Back) <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={() => openGuidelines('back')} activeOpacity={0.7}>
                        {backImage ? (
                            <>
                                <Image source={{ uri: backImage }} style={styles.previewImage} resizeMode="cover" />
                                <View style={styles.editBadge}>
                                    <Text style={styles.editIcon}>✎</Text>
                                </View>
                            </>
                        ) : (
                            <><Text style={styles.plusIcon}>+</Text><Text style={styles.uploadText}>Upload Photo</Text></>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Motorcycle brand/model */}
                <Text style={styles.fieldLabel}>Motorcycle brand/model <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={brandModel} onChangeText={setBrandModel} placeholder="" />

                {/* Plate number */}
                <Text style={styles.fieldLabel}>Plate number <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} placeholder="" />

                <TouchableOpacity style={styles.nextButton} onPress={() => router.push('/create-password')} activeOpacity={0.85}>
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
    fieldLabel: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
    input: {
        borderWidth: 0, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
        fontSize: 15, color: '#222', backgroundColor: '#f0f0f0', marginBottom: 20,
    },
    nextButton: { backgroundColor: ACCENT, borderRadius: 50, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
    nextText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});
