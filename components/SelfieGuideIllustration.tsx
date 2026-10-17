import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface SelfieGuideIllustrationProps {
  side?: 'selfie' | 'holding';
}

export default function SelfieGuideIllustration({ side = 'selfie' }: SelfieGuideIllustrationProps) {
  const isHolding = side === 'holding';

  return (
    <View style={styles.cardContainer}>
      {/* Visual Guide Viewfinder Frame */}
      <View style={styles.frameContainer}>
        {isHolding ? (
          /* Visual Guide: Bust + Holding Driver License */
          <Svg width="100%" height={210} viewBox="0 0 248 210" fill="none">
            {/* Viewfinder Corner Brackets */}
            <Path
              d="M 24 38 L 24 24 L 38 24"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 224 24 L 210 24 M 224 24 L 224 38"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 24 172 L 24 186 L 38 186"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 224 186 L 210 186 M 224 186 L 224 172"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dashed Face Alignment Guide */}
            <Ellipse
              cx={104}
              cy={80}
              rx={40}
              ry={48}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Shoulders / Bust (Shifted left to leave room for license, shortened neck) */}
            <Path
              d="M 20 210 C 24 172 52 142 82 130 L 94 128 L 94 114 L 122 114 L 122 128 L 134 130 C 152 136 168 150 178 174 L 168 210 Z"
              fill="#EEF2F6"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Collar Curve */}
            <Path
              d="M 94 128 C 100 134 116 134 122 128"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Neck */}
            <Path
              d="M 94 112 L 94 126 C 101 130 115 130 122 126 L 122 112"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth={2}
            />

            {/* Head & Jawline */}
            <Path
              d="M 78 78 C 78 108 89 122 104 122 C 119 122 131 108 131 78 C 131 48 119 40 104 40 C 89 40 78 48 78 78 Z"
              fill="#FFFFFF"
              stroke="#475569"
              strokeWidth={2}
            />

            {/* Hair Outline */}
            <Path
              d="M 76 76 C 72 58 84 34 104 34 C 124 34 136 58 132 76 C 128 62 120 52 104 52 C 88 52 80 62 76 76 Z"
              fill="#475569"
              stroke="#475569"
              strokeWidth={1.5}
            />

            {/* Ears */}
            <Path
              d="M 78 74 C 72 76 72 88 78 90"
              stroke="#64748B"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M 131 74 C 137 76 137 88 131 90"
              stroke="#64748B"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Minimalist Facial Features */}
            <Path
              d="M 88 70 Q 94 67 99 70"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Path
              d="M 110 70 Q 115 67 121 70"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Circle cx={94} cy={76} r={2} fill="#475569" />
            <Circle cx={116} cy={76} r={2} fill="#475569" />
            <Path
              d="M 98 98 Q 104 105 111 98"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Arm rising up to hold ID card */}
            <Path
              d="M 230 210 C 220 178 206 160 192 150"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* Driver License Card held by hand */}
            <Rect
              x={142}
              y={106}
              width={76}
              height={48}
              rx={6}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={2}
            />
            {/* Card Header Strip */}
            <Rect x={143} y={107} width={74} height={8} rx={4} fill="#DBEAFE" />
            {/* Card Photo placeholder */}
            <Rect
              x={148}
              y={119}
              width={16}
              height={20}
              rx={2}
              fill="#EFF6FF"
              stroke="#93C5FD"
              strokeWidth={1}
            />
            <Circle cx={156} cy={126} r={3.5} fill="#93C5FD" />
            <Path d="M 150 137 C 151 133 161 133 162 137" fill="#93C5FD" />
            {/* Card Information Lines */}
            <Line
              x1={170}
              y1={122}
              x2={210}
              y2={122}
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Line
              x1={170}
              y1={128}
              x2={202}
              y2={128}
              stroke="#CBD5E1"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Line
              x1={170}
              y1={134}
              x2={196}
              y2={134}
              stroke="#CBD5E1"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Fingers gripping card bottom edge */}
            <Path
              d="M 168 154 C 168 150 172 147 176 147 C 180 147 182 150 182 154 L 182 160 C 182 165 174 167 169 163 Z"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth={1.5}
            />
            <Path
              d="M 184 154 C 184 150 188 148 192 148 C 196 148 198 150 198 154 L 198 160 C 198 165 192 167 186 163 Z"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth={1.5}
            />
          </Svg>
        ) : (
          /* Visual Guide: Centered Face Selfie (Bust up) */
          <Svg width="100%" height={210} viewBox="0 0 248 210" fill="none">
            {/* Viewfinder Corner Brackets */}
            <Path
              d="M 24 38 L 24 24 L 38 24"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 224 24 L 210 24 M 224 24 L 224 38"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 24 172 L 24 186 L 38 186"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 224 186 L 210 186 M 224 186 L 224 172"
              stroke="#94A3B8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dashed Face Alignment Guide */}
            <Ellipse
              cx={124}
              cy={80}
              rx={44}
              ry={52}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Centered Shoulders / Bust (Shortened neck) */}
            <Path
              d="M 24 210 C 28 172 58 142 94 130 L 108 128 L 108 114 L 140 114 L 140 128 L 154 130 C 190 142 220 172 224 210 Z"
              fill="#EEF2F6"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Collar Curve */}
            <Path
              d="M 108 128 C 114 134 134 134 140 128"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Neck */}
            <Path
              d="M 110 112 L 110 126 C 118 130 132 130 138 126 L 138 112"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth={2}
            />

            {/* Head & Jawline */}
            <Path
              d="M 94 78 C 94 108 106 122 124 122 C 142 122 154 108 154 78 C 154 48 142 40 124 40 C 106 40 94 48 94 78 Z"
              fill="#FFFFFF"
              stroke="#475569"
              strokeWidth={2}
            />

            {/* Hair Outline */}
            <Path
              d="M 92 76 C 88 58 100 34 124 34 C 148 34 160 58 156 76 C 152 62 144 52 124 52 C 104 52 96 62 92 76 Z"
              fill="#475569"
              stroke="#475569"
              strokeWidth={1.5}
            />

            {/* Ears */}
            <Path
              d="M 94 74 C 88 76 88 88 94 90"
              stroke="#64748B"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M 154 74 C 160 76 160 88 154 90"
              stroke="#64748B"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Minimalist Facial Features */}
            <Path
              d="M 105 70 Q 112 67 117 70"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Path
              d="M 131 70 Q 136 67 143 70"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Circle cx={112} cy={76} r={2} fill="#475569" />
            <Circle cx={136} cy={76} r={2} fill="#475569" />
            <Path
              d="M 116 98 Q 124 106 132 98"
              stroke="#64748B"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
        )}
      </View>

      {/* Pill Badge matching reference design */}
      <View style={[styles.badge, isHolding && styles.badgeHolding]}>
        <Ionicons
          name={isHolding ? 'id-card' : 'camera'}
          size={16}
          color={isHolding ? '#0284C7' : '#7C3AED'}
        />
        <Text style={[styles.badgeText, isHolding && styles.badgeTextHolding]}>
          {isHolding ? 'Selfie with License' : 'Selfie'}
        </Text>
      </View>

      {/* Guidance Subtitle */}
      <Text style={styles.guidanceText}>
        {isHolding
          ? 'Hold your license beside your chest. Keep your face and license details clearly visible.'
          : 'Frame your face from bust up in good lighting. Look directly into the camera.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  frameContainer: {
    width: '100%',
    height: 210,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  badgeHolding: {
    backgroundColor: '#E0F2FE',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  badgeTextHolding: {
    color: '#0369A1',
  },
  guidanceText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
