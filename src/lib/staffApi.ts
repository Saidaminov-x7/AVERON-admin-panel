// src/lib/staffApi.ts
// API для управления сотрудниками и ролями (только SUPER_ADMIN)

import { api } from './axios';
import type { AdminUser, AdminRoleType } from '../store/authStore';

export const getStaffListApi = async (): Promise<AdminUser[]> => {
  const { data } = await api.get('/admin/staff');
  return data;
};

export const addStaffApi = async (dto: {
  email: string;
  adminRole: AdminRoleType;
  name?: string;
  phone?: string;
  password?: string;
}): Promise<AdminUser> => {
  const { data } = await api.post('/admin/staff', dto);
  return data;
};

export const updateStaffRoleApi = async (
  id: string,
  adminRole: AdminRoleType,
): Promise<AdminUser> => {
  const { data } = await api.patch(`/admin/staff/${id}`, { adminRole });
  return data;
};

export const revokeStaffApi = async (id: string): Promise<void> => {
  await api.delete(`/admin/staff/${id}`);
};
