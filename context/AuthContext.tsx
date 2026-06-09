import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useEffect, useState } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type AuthContextType = {
  loading: boolean;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
};

export const AuthContext = createContext<AuthContextType>({
  loading: true,
  accessToken: null,
  setAccessToken: () => { },
  user: null,
  setUser: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
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
          setUser(null);
        }

        return;
      }

      setAccessToken(data.accessToken);
      setUser(data.user);

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

  return (
    <AuthContext.Provider
      value={{
        loading,
        accessToken,
        setAccessToken,
        user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
