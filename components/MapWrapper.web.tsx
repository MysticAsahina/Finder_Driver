import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PROVIDER_GOOGLE = 'google';

export const Marker = ({ children, title }: any) => {
  return null;
};

export const MapViewDirections = () => null;

const MapView = React.forwardRef(({ children, style, initialRegion }: any, ref: any) => {
  return (
    <View style={[styles.webMapContainer, style]}>
      <View style={styles.webMapGrid}>
        <Text style={styles.webMapTitle}>🗺️ Finder Map View (Web Preview)</Text>
        <Text style={styles.webMapSub}>
          {initialRegion ? `Lat: ${initialRegion.latitude?.toFixed(4) ?? 15.4845}, Lng: ${initialRegion.longitude?.toFixed(4) ?? 120.9612}` : 'Location Active'}
        </Text>
      </View>
      {children}
    </View>
  );
});
MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  webMapContainer: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  webMapGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  webMapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  webMapSub: {
    fontSize: 13,
    color: '#64748b',
  },
});

export default MapView;
