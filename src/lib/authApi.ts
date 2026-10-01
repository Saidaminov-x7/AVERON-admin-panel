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
  requireTotp?: boolean;
  tempToken?: string;
  challengeToken?: string;
  expiresInSeconds?: number;
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

export interface AdminTotpSetup {
  setupToken: string;
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  expiresInSeconds: number;
}

export interface AdminTotpStatus {
  enabled: boolean;
  unusedRecoveryCodes: number;
}

export interface AdminRecoveryCodeResponse {
  recoveryCodes: string[];
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

export const verifyAdminTotpLoginApi = async (challengeToken: string, code: string): Promise<Verify2faResponse> => {
  const { data } = await api.post<Verify2faResponse>('/auth/login/verify-totp', { challengeToken, code });
  return data;
};

export const getAdminTotpStatusApi = async (): Promise<AdminTotpStatus> => {
  const { data } = await api.get<AdminTotpStatus>('/auth/admin/totp/status');
  return data;
};

export const setupAdminTotpApi = async (): Promise<AdminTotpSetup> => {
  const { data } = await api.post<AdminTotpSetup>('/auth/admin/totp/setup');
  return data;
};

export const enableAdminTotpApi = async (setupToken: string, code: string): Promise<AdminRecoveryCodeResponse> => {
  const { data } = await api.post<AdminRecoveryCodeResponse>('/auth/admin/totp/enable', { setupToken, code });
  return data;
};

export const regenerateAdminRecoveryCodesApi = async (currentPassword: string, code: string): Promise<AdminRecoveryCodeResponse> => {
  const { data } = await api.post<AdminRecoveryCodeResponse>('/auth/admin/totp/recovery-codes', { currentPassword, code });
  return data;
};

export const disableAdminTotpApi = async (currentPassword: string, code: string): Promise<void> => {
  await api.post('/auth/admin/totp/disable', { currentPassword, code });
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
