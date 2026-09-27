// src/providers/AdminThemeProvider.tsx
import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface ThemeSettingsData {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

export const getThemeSettingsApi = async (): Promise<ThemeSettingsData> => {
  const { data } = await api.get('/admin/theme');
  return data;
};

const ThemeContext = createContext<ThemeSettingsData | null>(null);
export const useAdminTheme = () => useContext(ThemeContext);

export const AdminThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data } = useQuery({
    queryKey: ['admin-theme-tokens'],
    queryFn: getThemeSettingsApi,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    // ВАЖНО: применяем ТОЛЬКО primary и primary-hover к админке,
    // чтобы контраст и читаемость админ-панели оставались четкими и независимыми
    if (data.primaryColor) {
      root.style.setProperty('--color-primary', data.primaryColor);
    }
    if (data.secondaryColor) {
      root.style.setProperty('--color-primary-hover', data.secondaryColor);
    }
  }, [data]);

  return <ThemeContext.Provider value={data ?? null}>{children}</ThemeContext.Provider>;
};
