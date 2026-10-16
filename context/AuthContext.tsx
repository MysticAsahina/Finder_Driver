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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (accessToken) {
      setAxiosAccessToken(accessToken);
    } else {
      setAxiosAccessToken(null);
    }
  }, [accessToken]);

  useEffect(() => {
    import('../utils/axios').then(({ setOnTokenRefresh }) => {
      setOnTokenRefresh((token) => {
        setAccessToken(token);
      });
    });
  }, []);

  useEffect(() => {
    if (accessToken) {
      registerPushToken(accessToken);
    }
  }, [accessToken]);

  async function restoreSession() {
    try {
      // Immediately restore cached user to avoid UI flashing empty / "undefined undefined"
      const cachedUserData = await SecureStore.getItemAsync("userData").catch(() => null);
      if (cachedUserData) {
        try {
          const parsed = JSON.parse(cachedUserData);
          if (parsed && typeof parsed === 'object') {
            setUser(parsed);
            if (parsed.emergencyContact) {
              setEmergencyContactState(parsed.emergencyContact);
            }
          }
        } catch (e) {
          console.warn("Failed to parse cached userData:", e);
        }
      }

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

      if (!res.ok) {
        if (res.status === 401) {
          await SecureStore.deleteItemAsync("refreshToken").catch(() => {});
          await SecureStore.deleteItemAsync("userData").catch(() => {});
          setAccessToken(null);
          setAxiosAccessToken(null);
          setUser(null);
        }

        return;
      }

      const data = await res.json();

      setAccessToken(data.accessToken);
      setAxiosAccessToken(data.accessToken);
      const profilePhoto = data.user?.profilePicture || null;

      let userDataToSet = data.user ? { ...data.user, profilePicture: profilePhoto } : null;

      // If data.user was not present on refresh response, fallback to /auth/me
      if (!userDataToSet?.firstName) {
        try {
          const meRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.accessToken}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.user) {
              userDataToSet = { ...meData.user, profilePicture: meData.user.profilePicture || null };
            }
          }
        } catch (meErr) {
          console.warn("Failed to fetch /auth/me fallback during restoreSession:", meErr);
        }
      }

      if (userDataToSet) {
        setUser(userDataToSet);
        await SecureStore.setItemAsync('userData', JSON.stringify(userDataToSet)).catch(() => {});
      }

      if (data.user?.emergencyContact || userDataToSet?.emergencyContact) {
        setEmergencyContactState(data.user?.emergencyContact || userDataToSet?.emergencyContact);
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
    } catch (err: any) {
      if (err?.message?.includes('SERVICE_NOT_AVAILABLE')) {
        console.log('Push notifications not available (usually means Google Play Services is missing on this emulator).');
      } else {
        console.warn('Failed to register push token:', err);
      }
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
