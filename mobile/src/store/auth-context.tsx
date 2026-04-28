import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, StorageKeys } from './storage';

interface AuthContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  splashShown: boolean;
  setSplashShown: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  splashShown: false,
  setSplashShown: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [splashShown, setSplashShown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getItem(StorageKeys.AUTH_TOKEN).then((token) => {
      setIsAuthenticated(!!token);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, splashShown, setSplashShown }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
