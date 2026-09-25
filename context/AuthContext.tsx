import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useEffect, useState } from "react";
import api, { setAxiosAccessToken } from "../utils/axios";

// LOCAL

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type EmergencyContact = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
};

type AuthContextType = {
  loading: boolean;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  emergencyContact: EmergencyContact | null;
  setEmergencyContact: (contact: EmergencyContact | null) => Promise<void>;
  setEmergencyContactState: React.Dispatch<React.SetStateAction<EmergencyContact | null>>;
};

export const AuthContext = createContext<AuthContextType>({
  loading: true,
  accessToken: null,
  setAccessToken: () => { },
  user: null,
  setUser: () => { },
  emergencyContact: null,
  setEmergencyContact: async () => { },
  setEmergencyContactState: () => { },
});

// DEV CONFIG: Set to true to bypass login/registration for frontend development without API
export const DEV_BYPASS_AUTH = true;

const MOCK_DRIVER_USER = {
  _id: 'dev-driver-id',
  firstName: 'Juan',
  lastName: 'Driver',
  email: 'driver@finder.com',
  mobileNumber: '09123456789',
  role: 'driver',
  hasMpin: false,
  isApproved: true
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (accessToken && !DEV_BYPASS_AUTH) {
      registerPushToken(accessToken);
    }
  }, [accessToken]);

  async function restoreSession() {
    if (DEV_BYPASS_AUTH) {
      setAccessToken('mock-dev-driver-token');
      setUser(MOCK_DRIVER_USER);
      setLoading(false);
      return;
    }

    try {
      const refreshToken =
        await SecureStore.getItemAsync("refreshToken");

      if (!refreshToken) {
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res;
      try {
        res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refreshToken }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          await SecureStore.deleteItemAsync("refreshToken");
          setAccessToken(null);
          setAxiosAccessToken(null);
          setUser(null);
        }

        return;
      }

      setAccessToken(data.accessToken);
      setAxiosAccessToken(data.accessToken);
      setUser(data.user);
      if (data.user?.emergencyContact) {
        setEmergencyContactState(data.user.emergencyContact);
      }
      registerPushToken(data.accessToken);

      // Store the rotated refresh token
      if (data.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      }

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function registerPushToken(token: string) {
    try {
      const Notifications = require('expo-notifications');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: require('expo-constants').default.expoConfig?.extra?.eas?.projectId,
      });

      // use api to send token
      await api.post('/support/push-token', { pushToken: pushTokenData.data });
    } catch (err) {
      console.error('Failed to register push token:', err);
    }
  }


  async function setEmergencyContact(contact: EmergencyContact | null) {
    try {
      await api.patch("/emergency-contact", contact || { firstName: null, lastName: null, mobileNumber: null });
      setEmergencyContactState(contact);
    } catch (err) {
      console.error("Failed to save emergency contact to API:", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        emergencyContact,
        setEmergencyContact,
        setEmergencyContactState,
        loading,
        accessToken,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
