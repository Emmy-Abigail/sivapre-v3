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
  // Primario — Neón Cyan
  primary: '#00f3ff',
  primaryLight: '#33f5ff',
  primaryDark: '#00c4cc',
  primarySubtle: 'rgba(0, 243, 255, 0.08)',

  // Fondos
  background: '#050505',
  surface: '#111111',
  surfaceVariant: '#1a1a1a',

  // Texto
  text: '#ffffff',
  textSecondary: '#888888',
  textDisabled: '#444444',
  textOnPrimary: '#000000',

  // Bordes y divisores
  border: '#222222',
  divider: '#1a1a1a',

  // Semánticos — Neón Magenta / Naranja / Verde
  error: '#ff003c',
  errorLight: 'rgba(255, 0, 60, 0.1)',
  errorText: '#ff003c',

  warning: '#ff6600',
  warningLight: 'rgba(255, 102, 0, 0.1)',
  warningText: '#ff9944',

  success: '#00ff88',
  successLight: 'rgba(0, 255, 136, 0.1)',
  successText: '#00ff88',

  // Extra
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 243, 255, 0.4)',
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

  // Siempre modo neón oscuro
  void systemScheme;
  const isDark = true;

  const colors = darkColors;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    storage.setItem(StorageKeys.THEME_MODE, newMode);
    setMode(newMode);
  }, []);

  return { colors, mode, isDark, setThemeMode };
}
