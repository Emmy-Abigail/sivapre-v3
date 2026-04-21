// useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { storage, StorageKeys } from '../store/storage';
import { useAuthContext } from '../store/auth-context';
import type { LoginPayload, RegisterPayload, Usuario } from '../types';

export function useAuth() {
  const { setIsAuthenticated } = useAuthContext();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    storage.getItem(StorageKeys.USER_DATA).then((raw) => {
      if (!raw) return;
      try {
        setUsuario(JSON.parse(raw) as Usuario);
      } catch {
        // datos corruptos, ignorar
      }
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      setUsuario(data.usuario);
      setIsAuthenticated(true);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (data) => {
      setUsuario(data.usuario);
      setIsAuthenticated(true);
    },
  });

  const logout = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    setIsAuthenticated(false);
  }, [setIsAuthenticated]);

  return {
    usuario,
    isAuthenticated: !!usuario,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}
