'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Rental } from '@/lib/api';

interface TabletContextType {
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  clearSession: () => void;
}

interface UserData {
  id: string;
  name: string;
  studentId: string;
  grade?: string | null;
  major?: string | null;
  rentals: Rental[];
}

const TabletContext = createContext<TabletContextType | undefined>(undefined);

export function TabletProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  const clearSession = () => {
    setSessionToken(null);
    setUserData(null);
  };

  return (
    <TabletContext.Provider
      value={{
        sessionToken,
        setSessionToken,
        userData,
        setUserData,
        clearSession,
      }}
    >
      {children}
    </TabletContext.Provider>
  );
}

export function useTablet() {
  const context = useContext(TabletContext);
  if (context === undefined) {
    throw new Error('useTablet must be used within a TabletProvider');
  }
  return context;
}
