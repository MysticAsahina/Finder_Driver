import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useEffect, useState } from "react";

export type EmergencyContact = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
};

type AuthContextType = {
  user: any;
  setUser: (user: any) => Promise<void>;
  emergencyContact: EmergencyContact | null;
  setEmergencyContact: (contact: EmergencyContact | null) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: async () => {},
  emergencyContact: null,
  setEmergencyContact: async () => {},
});

const DEFAULT_USER = {
  firstName: 'Marcelino',
  lastName: 'Zafra',
  mobileNumber: '+63 9295624051',
  email: '',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<any>(null);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(null);

  useEffect(() => {
    loadUser();
    loadEmergencyContact();
  }, []);

  async function loadUser() {
    try {
      const stored = await SecureStore.getItemAsync("driver_profile");
      if (stored) {
        setUserState(JSON.parse(stored));
      } else {
        setUserState(DEFAULT_USER);
      }
    } catch (err) {
      console.error("Failed to load driver profile:", err);
      setUserState(DEFAULT_USER);
    }
  }

  async function setUser(updatedUser: any) {
    try {
      if (updatedUser) {
        await SecureStore.setItemAsync("driver_profile", JSON.stringify(updatedUser));
      } else {
        await SecureStore.deleteItemAsync("driver_profile");
      }
      setUserState(updatedUser);
    } catch (err) {
      console.error("Failed to save driver profile:", err);
    }
  }

  async function loadEmergencyContact() {
    try {
      const contactStr = await SecureStore.getItemAsync("emergencyContact");
      if (contactStr) {
        setEmergencyContactState(JSON.parse(contactStr));
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
