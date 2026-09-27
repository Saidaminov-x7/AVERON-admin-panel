// src/components/AdminThemeInjector.tsx
// Применяет тему ПАНЕЛИ АДМИНИСТРАТОРА при загрузке приложения через CSS-переменные.
// Рендерится параллельно с роутами, не блокирует UI.

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

interface AdminThemeData {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

const DEFAULT_ADMIN_THEME: AdminThemeData = {
  primaryColor: '#7c3aed',
  secondaryColor: '#5b21b6',
  backgroundColor: '#0f0f0f',
  textColor: '#f1f5f9',
  borderRadius: '0.75rem',
  fontFamily: 'Inter, sans-serif',
};

const getAdminThemeApi = async (): Promise<AdminThemeData> => {
  const { data } = await api.get('/site-settings/public/theme');
  return data;
};

export default function AdminThemeInjector() {
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'shared-theme'],
    queryFn: getAdminThemeApi,
    // Не показываем ошибку если нет доступа (ещё не залогинились)
    retry: false,
    // Используем staleTime чтобы не перефетчивать при каждой навигации
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  useEffect(() => {
    const theme = data ?? DEFAULT_ADMIN_THEME;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-primary-hover', theme.secondaryColor);
    root.style.setProperty('--radius', theme.borderRadius);
    root.style.setProperty('--border-radius', theme.borderRadius);
    if (theme.fontFamily) {
      root.style.setProperty('--font-family', theme.fontFamily);
      document.body.style.fontFamily = theme.fontFamily;
    }
  }, [data]);

  if (isLoading) return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b0e13] text-white"><div className="text-center"><div className="text-2xl font-black tracking-[.24em]">AVERON</div><div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500"/><p className="mt-3 text-xs text-slate-500">Загружаем оформление</p></div></div>;
  return null;
}
