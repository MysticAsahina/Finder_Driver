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
};

export const AuthContext = createContext<AuthContextType>({
  loading: true,
  accessToken: null,
  setAccessToken: () => { },
  user: null,
  setUser: () => { },
  emergencyContact: null,
  setEmergencyContact: async () => { },
});

const DEFAULT_USER = {
  firstName: 'Marcelino',
  lastName: 'Zafra',
  mobileNumber: '+63 9295624051',
  email: '',
};

// MICHAEL


export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(null);

  useEffect(() => {
    restoreSession();
    loadEmergencyContact();
  }, []);

  async function restoreSession() {
    try {
      const refreshToken =
        await SecureStore.getItemAsync("refreshToken");

      if (!refreshToken) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshToken }),
      });

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

  async function loadEmergencyContact() {
    try {
      const contactStr = await SecureStore.getItemAsync("emergencyContact");
      if (contactStr) {
        setEmergencyContact(JSON.parse(contactStr));
      }
    } catch (err) {
      console.error("Failed to load emergency contact:", err);
    }
  }

  async function setEmergencyContact(contact: EmergencyContact | null) {
    try {
      if (contact) {
        await SecureStore.setItemAsync("emergencyContact", JSON.stringify(contact));
      } else {
        await SecureStore.deleteItemAsync("emergencyContact");
      }
      setEmergencyContactState(contact);
    } catch (err) {
      console.error("Failed to save emergency contact:", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        emergencyContact,
        setEmergencyContact,
        loading,
        accessToken,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
