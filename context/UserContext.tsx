// context/UserContext.tsx
import React, { createContext, ReactNode, useState } from "react";

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
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  updateUserAddress: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const updateUserAddress = (address: string) => {
    if (user) {
      setUser({ ...user, address });
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUserAddress }}>
      {children}
    </UserContext.Provider>
  );
}
