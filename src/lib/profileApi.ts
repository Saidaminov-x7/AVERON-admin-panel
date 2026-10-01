// src/lib/profileApi.ts
// API для работы с профилем текущего администратора

import { api } from './axios';
import type { AdminUser } from '../store/authStore';

export const getProfileApi = async (): Promise<AdminUser> => {
  const { data } = await api.get('/admin/me');
  return data;
};

export const updateProfileApi = async (dto: {
  name?: string;
  avatar?: string | null;
  telegramId?: string;
}): Promise<AdminUser> => {
  const { data } = await api.patch('/admin/profile', dto);
  return data;
};

export const changePasswordApi = async (dto: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const { data } = await api.patch('/admin/profile/password', dto);
  return data;
};

export const uploadMediaApi = async (file: File): Promise<{ url: string; id: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};
