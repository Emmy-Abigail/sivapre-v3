import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  THEME_MODE: 'theme_mode',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  NOTIF_ALERTAS: 'notif_alertas',
  NOTIF_ESTADO_REPORTE: 'notif_estado_reporte',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const storage = {
  getItem(key: StorageKey): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  setItem(key: StorageKey, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  removeItem(key: StorageKey): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};
