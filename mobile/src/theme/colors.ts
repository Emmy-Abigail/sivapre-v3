import { useColorScheme } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { storage, StorageKeys } from '../store/storage';
import type { ThemeMode } from '../types';

// ─── Paleta base SIVAPRE (verde principal #0F6E56) ───────────────────────────

const lightColors = {
  // Primario
  primary: '#0F6E56',
  primaryLight: '#1A9070',
  primaryDark: '#0A4F3E',
  primarySubtle: '#E8F5F1',

  // Fondos
  background: '#F5F8F7',
  surface: '#FFFFFF',
  surfaceVariant: '#EDF3F1',

  // Texto
  text: '#1A2421',
  textSecondary: '#5A7068',
  textDisabled: '#A8BCB6',
  textOnPrimary: '#FFFFFF',

  // Bordes y divisores
  border: '#C8D8D3',
  divider: '#E0EBEBEB',

  // Semánticos
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  errorText: '#B71C1C',

  warning: '#E65100',
  warningLight: '#FFF3E0',
  warningText: '#BF360C',

  success: '#1B5E20',
  successLight: '#E8F5E9',
  successText: '#1B5E20',

  // Extra
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(15, 110, 86, 0.15)',
} as const;

const darkColors = {
  // Primario (más brillante para contraste en oscuro)
  primary: '#2ECC9A',
  primaryLight: '#38DBA8',
  primaryDark: '#1A9070',
  primarySubtle: '#0A2E24',

  // Fondos
  background: '#0D1A16',
  surface: '#152620',
  surfaceVariant: '#1E3228',

  // Texto
  text: '#E8F0ED',
  textSecondary: '#8FA8A0',
  textDisabled: '#4A6058',
  textOnPrimary: '#0D1A16',

  // Bordes y divisores
  border: '#2A3D36',
  divider: '#243D35',

  // Semánticos
  error: '#EF5350',
  errorLight: '#4E1010',
  errorText: '#FF8A80',

  warning: '#FFA726',
  warningLight: '#3E2500',
  warningText: '#FFD180',

  success: '#66BB6A',
  successLight: '#1B3A1C',
  successText: '#B9F6CA',

  // Extra
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(46, 204, 154, 0.15)',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;

// ─── Hook useTheme ────────────────────────────────────────────────────────────

interface UseThemeReturn {
  colors: AppColors;
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeReturn {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(StorageKeys.THEME_MODE).then((saved) => {
      if (saved) setMode(saved as ThemeMode);
    });
  }, []);

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    storage.setItem(StorageKeys.THEME_MODE, newMode);
    setMode(newMode);
  }, []);

  return { colors, mode, isDark, setThemeMode };
}
