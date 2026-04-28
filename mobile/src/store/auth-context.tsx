import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { storage, StorageKeys } from './storage';
import { setUnauthorizedHandler } from './auth-signal';

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

  // Ref para que el handler de señal siempre vea el setter actualizado
  const setAuthRef = useRef(setIsAuthenticated);
  setAuthRef.current = setIsAuthenticated;

  useEffect(() => {
    storage.getItem(StorageKeys.AUTH_TOKEN).then((token) => {
      setIsAuthenticated(!!token);
      setLoading(false);
    });

    // Cuando el interceptor detecta un 401, cierra la sesión desde aquí
    setUnauthorizedHandler(() => {
      setAuthRef.current(false);
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
