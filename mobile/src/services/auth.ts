import { api } from './api';
import { storage, StorageKeys } from '../store/storage';
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
} from '../types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    _persistSession(data);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    _persistSession(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      await Promise.all([
        storage.removeItem(StorageKeys.AUTH_TOKEN),
        storage.removeItem(StorageKeys.REFRESH_TOKEN),
        storage.removeItem(StorageKeys.USER_DATA),
      ]);
    }
  },

  async getToken(): Promise<string | null> {
    return storage.getItem(StorageKeys.AUTH_TOKEN);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
    return !!token;
  },
};

async function _persistSession(authData: AuthResponse) {
  await Promise.all([
    storage.setItem(StorageKeys.AUTH_TOKEN, authData.token),
    storage.setItem(StorageKeys.REFRESH_TOKEN, authData.refreshToken),
    storage.setItem(StorageKeys.USER_DATA, JSON.stringify(authData.usuario)),
  ]);
}
