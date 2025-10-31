// context/UserContext.tsx
import React, { createContext, ReactNode, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  number: string;
  full_name?: string;
  address?: string;
  is_admin?: number;
  created_at?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserAddress: (address: string) => void;
  logout: () => Promise<void>;
}

const STORAGE_KEY = '@agro_user';

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  updateUserAddress: () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUserState(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const setUser = async (u: User | null) => {
    setUserState(u);
    try {
      if (u) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const updateUserAddress = (address: string) => {
    if (user) {
      const updated = { ...user, address } as User;
      setUser(updated);
    }
  };

  const logout = async () => {
    await setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUserAddress, logout }}>
      {children}
    </UserContext.Provider>
  );
}
