import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT } from '@/constants/theme';

function WarningTriangleIcon({ size = 58 }: { size?: number }) {
    return (
        <Svg width={size} height={size * 0.9} viewBox="0 0 60 54" fill="none">
            <Path
                d="M25.67 5.5c1.92-3.33 6.74-3.33 8.66 0l23.5 40.7c1.92 3.33-.48 7.5-4.33 7.5H6.5c-3.85 0-6.25-4.17-4.33-7.5L25.67 5.5z"
                fill={ACCENT}
            />
            <Rect x="27.6" y="18" width="4.8" height="16" rx="2.4" fill="#FFFFFF" />
            <Circle cx="30" cy="41" r="2.8" fill="#FFFFFF" />
        </Svg>
    );
}

export default function AccountSuspendedScreen() {
    const router = useRouter();
    const [reason, setReason] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const handlePickPhoto = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'We need camera roll permissions to upload proof photos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (err) {
            console.error('Error picking photo:', err);
        }
    };

    const handleAppeal = () => {
        // Frontend preview: direct transition to Appeal Pending screen
        router.push('/appeal-pending');
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* Top Bar with Back Button for convenient preview navigation */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header with Title and Warning Icon */}
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>Account Suspended</Text>
                        <WarningTriangleIcon size={54} />
                    </View>

                    {/* Subtitle / Description */}
                    <Text style={styles.subtitle}>
                        Your account has been suspended because of (REASON). You have (#) day/s to appeal before deletion.
                    </Text>

                    {/* Appeal Reason Section */}
                    <Text style={styles.sectionLabel}>Appeal Reason</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder=""
                        placeholderTextColor="#aaa"
                        multiline
                        textAlignVertical="top"
                        value={reason}
                        onChangeText={setReason}
                    />

                    {/* Upload Photo Button / Preview */}
                    <View style={styles.uploadContainer}>
                        {photoUri ? (
                            <View style={styles.previewCard}>
                                <Image source={{ uri: photoUri }} style={styles.previewImage} />
                                <TouchableOpacity
                                    style={styles.removePhotoBtn}
                                    onPress={() => setPhotoUri(null)}
                                >
                                    <Ionicons name="close-circle" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.uploadBox}
                                onPress={handlePickPhoto}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={28} color="#333" />
                                <Text style={styles.uploadText}>Upload Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Spacer to push button down cleanly */}
                    <View style={{ flex: 1, minHeight: 60 }} />

                    {/* APPEAL Button */}
                    <TouchableOpacity
                        style={styles.appealBtn}
                        onPress={handleAppeal}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.appealBtnText}>APPEAL</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    flex: {
        flex: 1,
    },
    topBar: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backBtn: {
        alignSelf: 'flex-start',
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        flexGrow: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 16,
    },
    title: {
        fontSize: 27,
        fontWeight: '800',
        color: ACCENT,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13.5,
        fontWeight: '500',
        color: ACCENT,
        lineHeight: 20,
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 10,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#E6E6E6',
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: '#1a1a1a',
        backgroundColor: '#FFFFFF',
        height: 180,
    },
    uploadContainer: {
        marginTop: 20,
        alignItems: 'flex-start',
    },
    uploadBox: {
        width: 110,
        height: 80,
        borderWidth: 1.2,
        borderColor: '#B0B0B0',
        borderStyle: 'dashed',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    uploadText: {
        fontSize: 11,
        color: '#777',
        marginTop: 2,
        fontWeight: '500',
    },
    previewCard: {
        position: 'relative',
        width: 110,
        height: 80,
        borderRadius: 10,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
    },
    appealBtn: {
        backgroundColor: ACCENT,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    appealBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
