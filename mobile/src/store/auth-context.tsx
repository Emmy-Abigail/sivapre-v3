import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { storage, StorageKeys } from './storage';
import { setUnauthorizedHandler } from './auth-signal';
import type { Usuario } from '../types';

interface AuthContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
  splashShown: boolean;
  setSplashShown: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  usuario: null,
  setUsuario: () => {},
  splashShown: false,
  setSplashShown: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [splashShown, setSplashShown] = useState(false);
  const [loading, setLoading] = useState(true);

  const setAuthRef = useRef(setIsAuthenticated);
  setAuthRef.current = setIsAuthenticated;
  const setUsuarioRef = useRef(setUsuario);
  setUsuarioRef.current = setUsuario;

  useEffect(() => {
    (async () => {
      const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
      if (token) {
        const raw = await storage.getItem(StorageKeys.USER_DATA);
        if (raw) {
          try { setUsuario(JSON.parse(raw) as Usuario); } catch {}
        }
        setIsAuthenticated(true);
      }
      setLoading(false);
    })();

    setUnauthorizedHandler(() => {
      setAuthRef.current(false);
      setUsuarioRef.current(null);
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, usuario, setUsuario, splashShown, setSplashShown }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
