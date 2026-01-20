// context/UserContext.tsx
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { secureStorage } from '../lib/secureStorage';
import { api, API_URL } from '../lib/api';

interface User {
  id: number;
  number: string;
  full_name?: string;
  // legacy single address (kept for backward compatibility)
  address?: string;
  booking_address?: string;
  delivery_address?: string;
  is_admin?: number;
  created_at?: string;
}

interface SetUserOptions {
  persist?: boolean; // default true
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null, options?: SetUserOptions) => void | Promise<void>;
  updateUserAddress: (address: string) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  updateUserAddress: () => {},
  logout: async () => {},
  isLoading: true,
  isAuthenticated: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validate token and restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await secureStorage.getToken();
        if (token && API_URL) {
          // Validate token with backend
          try {
            const userData = await api.get('/auth/me');
            if (userData) {
              setUserState(userData);
              setIsAuthenticated(true);
            }
          } catch (error) {
            // Token invalid or expired, clear storage
            await secureStorage.clearAuth();
            setUserState(null);
            setIsAuthenticated(false);
          }
        } else {
          // Try to load user from secure storage (fallback for local mode)
          const savedUser = await secureStorage.getUser();
          if (savedUser) {
            setUserState(savedUser);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Session restore failed:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setUser = async (u: User | null, options?: SetUserOptions) => {
    const persist = options?.persist ?? true;
    setUserState(u);
    setIsAuthenticated(!!u);
    
    try {
      if (!persist) {
        // Session-only: keep in memory, clear any stored value.
        await secureStorage.clearAuth();
        return;
      }
      if (u) {
        await secureStorage.saveUser(u);
      } else {
        await secureStorage.clearAuth();
      }
    } catch (error) {
      console.error('Error setting user:', error);
    }
  };

  const updateUserAddress = (address: string) => {
    if (user) {
      const updated = { ...user, address } as User;
      setUser(updated, { persist: true });
    }
  };

  const logout = async () => {
    await secureStorage.clearAuth();
    setUserState(null);
    setIsAuthenticated(false);
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUserAddress, logout, isLoading, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}
