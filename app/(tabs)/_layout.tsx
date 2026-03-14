import { Tabs } from 'expo-router';
import React, { useRef, useEffect, useState } from 'react';
import {
  View, StyleSheet,
  Animated, TouchableOpacity, Text,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const ORANGE = Colors.light.tint; // #FF5F00
const INACTIVE = '#b0b0b0';
const TAB_COUNT = 3;

// ── Tab icons ──────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  activity: { active: 'document-text', inactive: 'document-text-outline' },
  index: { active: 'location', inactive: 'location-outline' },
  user: { active: 'person', inactive: 'person-outline' },
};

// ── Animated tab item ──────────────────────────────────────────────────────

function TabItem({
  route,
  isFocused,
  label,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  label: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.85)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1 : 0.85,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.6,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const icons = TAB_ICONS[route.name] ?? TAB_ICONS['index'];
  const iconName = isFocused ? icons.active : icons.inactive;
  const color = isFocused ? ORANGE : INACTIVE;

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.tabInner,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        <Ionicons name={iconName as any} size={24} color={color} />
        <View style={{ height: 3 }} />
        <Text style={[styles.labelTxt, isFocused && styles.labelTxtActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Custom tab bar with sliding pill ──────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const pillAnim = useRef(new Animated.Value(state.index)).current;
  const [barWidth, setBarWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const tabWidth = barWidth / TAB_COUNT;

  const pillTranslateX = pillAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  return (
    <View style={[styles.barWrapper, { paddingBottom: insets.bottom }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Sliding background pill */}
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: `${100 / TAB_COUNT}%`,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
          pointerEvents="none"
        />

        {/* Tab items */}
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              label={label}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="user" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
  bar: {
    flexDirection: 'row',
    paddingVertical: 8,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 0,
    backgroundColor: '#FFF3EC',
    borderRadius: 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  labelTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE,
    letterSpacing: 0.3,
  },
  labelTxtActive: {
    color: ORANGE,
    fontWeight: '800',
  },
});
