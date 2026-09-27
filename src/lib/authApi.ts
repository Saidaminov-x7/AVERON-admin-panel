// src/lib/authApi.ts
// API функции для авторизации

import { api } from './axios';
import type { AdminUser } from '../store/authStore';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: AdminUser;
  require2fa?: boolean;
  tempToken?: string;
  message?: string;
}

export interface Verify2faCredentials {
  tempToken: string;
  code: string;
}

export interface Verify2faResponse {
  accessToken: string;
  user: AdminUser;
}

// Вход в систему
export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
};

// Верификация 2FA кода из Telegram
export const verify2faApi = async (credentials: Verify2faCredentials): Promise<Verify2faResponse> => {
  const { data } = await api.post<Verify2faResponse>('/auth/verify-2fa', credentials);
  return data;
};

// Повторная отправка 2FA кода в Telegram
export const resend2faApi = async (tempToken: string): Promise<{ ok: boolean; message: string }> => {
  const { data } = await api.post<{ ok: boolean; message: string }>('/auth/resend-2fa', { tempToken });
  return data;
};

// Выход
export const logoutApi = async (): Promise<void> => {
  await api.post('/auth/logout');
};

// Получить текущего пользователя (для инициализации сессии)
export const getMeApi = async (): Promise<AdminUser> => {
  const { data } = await api.get<AdminUser>('/auth/me');
  return data;
};

// Обновить access token через refresh (refresh token в cookie)
export const refreshApi = async (): Promise<{ accessToken: string }> => {
  const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
  return data;
};
