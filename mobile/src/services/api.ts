// services - api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, StorageKeys } from '../store/storage';

// Cambia esta URL por la IP/dominio real del backend en cada entorno
export const BASE_URL = __DEV__
  ? 'http://192.168.18.29:8000/api/v1'
  : 'https://api.sivapre.gob/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Adjunta el token JWT en cada petición autenticada
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejo global de errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado: limpia credenciales
      await Promise.all([
        storage.removeItem(StorageKeys.AUTH_TOKEN),
        storage.removeItem(StorageKeys.REFRESH_TOKEN),
        storage.removeItem(StorageKeys.USER_DATA),
      ]);
    }
    return Promise.reject(error);
  },
);
