// src/store/authStore.ts
// Zustand store для состояния авторизации
// Access token хранится в памяти (не в localStorage — XSS защита)
// Refresh token хранится в httpOnly cookie бэкенда

import { create } from 'zustand';

export type AdminRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  adminRole?: AdminRoleType | null;
  phone?: string;
  telegramId?: string | null;
  avatar?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
}

interface AuthState {
  // Access token в памяти (сбрасывается при перезагрузке)
  accessToken: string | null;
  // Данные пользователя
  user: AdminUser | null;
  // Флаг инициализации (проверка /auth/me при загрузке)
  isInitialized: boolean;

  // Действия
  setAuth: (token: string, user: AdminUser) => void;
  setToken: (token: string) => void;
  updateUser: (partial: Partial<AdminUser>) => void;
  logout: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,

  // Установить авторизацию (после логина или refresh)
  setAuth: (token, user) => set({ accessToken: token, user, isInitialized: true }),

  // Обновить только токен (после refresh)
  setToken: (token) => set({ accessToken: token }),

  // Обновить данные пользователя в сторе (например, после редактирования профиля)
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  // Выход — очистить состояние
  logout: () => set({ accessToken: null, user: null }),

  // Пометить как инициализированный (даже если пользователь не авторизован)
  setInitialized: () => set({ isInitialized: true }),
}));
