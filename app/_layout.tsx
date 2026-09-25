import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as RN from 'react-native';

if (Platform.OS === 'web' && !(RN as any).requireNativeComponent) {
  (RN as any).requireNativeComponent = () => () => null;
}

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import AppLifecycleObserver from '@/components/AppLifecycleObserver';
import GlobalCallListener from '@/components/GlobalCallListener';
import '@/utils/backgroundLocation';

if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// @ts-ignore
global.isRideChatActive = false;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    if (data?.type === 'ride_chat' && (global as any).isRideChatActive) {
      return {
        shouldShowBanner: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    };
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SocketProvider>
        <GlobalCallListener />
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AppLifecycleObserver />
            <Stack initialRouteName="index">
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="terms"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="otp"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="driving-license"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="face-verification"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="vehicle-registration"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="tricycle-details"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="create-password"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="fare-metrics"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="help-centre"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="faqs"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="booking-issue"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="support-chat"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="trip-details"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="passenger-chat"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="upload-guidelines"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="emergency-contact"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="setup-mpin"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="enter-mpin"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="waiting-approval"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="passenger-call"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: false, animation: 'fade' }}
          />
        </Stack>
        <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

