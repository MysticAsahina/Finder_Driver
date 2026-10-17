import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setCapturingCamera } from '@/store/driverRegistrationStore';

interface GuidedCameraModalProps {
  visible: boolean;
  side: 'selfie' | 'holding';
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export default function GuidedCameraModal({
  visible,
  side,
  onCapture,
  onClose,
}: GuidedCameraModalProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const hasRequestedOnOpen = useRef(false);

  const isHolding = side === 'holding';
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Center positioning for loose guidelines
  const faceCx = isHolding ? screenWidth * 0.40 : screenWidth * 0.5;
  const faceCy = screenHeight * 0.36;
  const faceRx = isHolding ? screenWidth * 0.26 : screenWidth * 0.30;
  const faceRy = screenHeight * 0.17;

  // ID card placement for holding mode
  const cardX = screenWidth * 0.56;
  const cardY = screenHeight * 0.42;
  const cardW = screenWidth * 0.38;
  const cardH = cardW * 0.65;

  // Manage registration camera state and initial permission check
  useEffect(() => {
    if (visible) {
      setCapturingCamera(true).catch(() => {});

      if (!permission) {
        // Permission status is still loading
        getPermission().catch(() => {});
      } else if (!permission.granted) {
        // If undetermined, prompt the user once automatically
        if (permission.status === 'undetermined' && !hasRequestedOnOpen.current) {
          hasRequestedOnOpen.current = true;
          requestPermission().catch(() => {});
        }
      }
    } else {
      setCapturingCamera(false).catch(() => {});
      hasRequestedOnOpen.current = false;
    }
  }, [visible, permission?.status]);

  // When returning to the app from Android Settings, re-check permission status automatically
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && visible) {
        getPermission().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (err: any) {
      console.error('Camera capture error:', err);
    } finally {
      setIsCapturing(false);
      setCapturingCamera(false).catch(() => {});
    }
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Permission Loading State */}
        {permission === null ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5F00" />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        ) : !permission.granted ? (
          /* Permission Request / Blocked View */
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera" size={36} color="#FF5F00" />
              </View>
              <Text style={styles.permissionTitle}>Camera Access Needed</Text>
              <Text style={styles.permissionDesc}>
                {permission.canAskAgain
                  ? 'We need access to your camera to capture your face verification photo with alignment guides.'
                  : 'Camera access has been disabled. Please open device settings to allow camera permissions for FINDER.'}
              </Text>
              {permission.canAskAgain ? (
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantBtnText}>ALLOW CAMERA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={() => Linking.openSettings()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantBtnText}>OPEN SETTINGS</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : (
          /* Live Camera View with Guidelines */
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mirror={facing === 'front'}
            />

            {/* Loose SVG Guidelines Overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={screenWidth} height={screenHeight}>
                {/* Viewfinder corner brackets */}
                <Path
                  d={`M 30 ${faceCy - faceRy - 20} L 30 ${faceCy - faceRy - 40} L 50 ${faceCy - faceRy - 40}`}
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={`M ${screenWidth - 30} ${faceCy - faceRy - 20} L ${screenWidth - 30} ${faceCy - faceRy - 40} L ${screenWidth - 50} ${faceCy - faceRy - 40}`}
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={`M 30 ${faceCy + faceRy + 70} L 30 ${faceCy + faceRy + 90} L 50 ${faceCy + faceRy + 90}`}
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={`M ${screenWidth - 30} ${faceCy + faceRy + 70} L ${screenWidth - 30} ${faceCy + faceRy + 90} L ${screenWidth - 50} ${faceCy + faceRy + 90}`}
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Loose Face Oval Guideline */}
                <Ellipse
                  cx={faceCx}
                  cy={faceCy}
                  rx={faceRx}
                  ry={faceRy}
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth={2.5}
                  strokeDasharray="8 8"
                  fill="none"
                />

                {/* Loose Shoulder / Bust Line Indicator */}
                <Path
                  d={`M ${faceCx - faceRx * 1.5} ${faceCy + faceRy + 50} Q ${faceCx} ${faceCy + faceRy + 15} ${faceCx + faceRx * 1.5} ${faceCy + faceRy + 50}`}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  fill="none"
                />

                {/* Loose ID Card Guideline (Holding Mode Only) */}
                {isHolding && (
                  <>
                    <Rect
                      x={cardX}
                      y={cardY}
                      width={cardW}
                      height={cardH}
                      rx={10}
                      stroke="#60A5FA"
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                      fill="rgba(37, 99, 235, 0.12)"
                    />
                    {/* Mini ID icon preview lines */}
                    <Rect
                      x={cardX + 8}
                      y={cardY + 10}
                      width={cardW * 0.3}
                      height={cardH * 0.55}
                      rx={3}
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth={1.5}
                      fill="none"
                    />
                    <Line
                      x1={cardX + cardW * 0.45}
                      y1={cardY + 15}
                      x2={cardX + cardW - 10}
                      y2={cardY + 15}
                      stroke="rgba(255, 255, 255, 0.7)"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={cardX + cardW * 0.45}
                      y1={cardY + 25}
                      x2={cardX + cardW - 14}
                      y2={cardY + 25}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </Svg>
            </View>

            {/* Holding Mode Text Tag inside Card Guideline */}
            {isHolding && (
              <View
                style={[
                  styles.cardGuideTag,
                  {
                    left: cardX,
                    top: cardY + cardH + 6,
                    width: cardW,
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.cardGuideText}>HOLD ID HERE</Text>
              </View>
            )}

            {/* Top Bar (Header + Controls) */}
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.pillBadge}>
                <Ionicons
                  name={isHolding ? 'id-card' : 'camera'}
                  size={15}
                  color={isHolding ? '#60A5FA' : '#C084FC'}
                />
                <Text style={styles.pillBadgeText}>
                  {isHolding ? 'Selfie with License' : 'Face Selfie'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.circleBtn}
                onPress={toggleFacing}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Instruction Floating Banner */}
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionBannerText}>
                {isHolding
                  ? 'Align face in oval & hold license beside chest'
                  : 'Center your face within the dashed oval'}
              </Text>
            </View>

            {/* Bottom Controls Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.bottomSideBtnPlaceholder} />

              {/* Shutter Button */}
              <TouchableOpacity
                style={styles.shutterOuter}
                onPress={handleCapture}
                activeOpacity={0.75}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#FF5F00" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>

              {/* Flip Button Shortcut */}
              <TouchableOpacity
                style={styles.bottomSideBtn}
                onPress={toggleFacing}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  permissionCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  grantBtn: {
    backgroundColor: '#FF5F00',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  grantBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  instructionBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 88,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
  },
  instructionBannerText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardGuideTag: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardGuideText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 20,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  bottomSideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSideBtnPlaceholder: {
    width: 48,
    height: 48,
  },
});
