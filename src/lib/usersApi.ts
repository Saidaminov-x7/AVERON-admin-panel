// src/lib/usersApi.ts
// API функции для управления пользователями (admin)

import { api } from './axios';
import type { PaginatedResponse } from './listingsApi';

export type UserRole = 'USER' | 'ADMIN';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  adminRole?: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | null;
  verified: boolean;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
  avatar: string | null;
  _count: { listings: number };
}

export interface AdminUserProfile extends AdminUser {
  lastLoginAt: string | null;
  updatedAt: string;
  listings: Array<{
    id: string;
    title: string;
    city: string;
    district: string;
    price: number;
    area: number;
    rooms: number;
    moderationStatus: string;
    images: Array<{ url: string }>;
  }>;
}

export interface UsersFilter {
  page?: number;
  limit?: number;
  role?: UserRole;
  isBlocked?: boolean;
  isStaff?: boolean;
  city?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  lastActiveDays?: number;
  createdAfterDays?: number;
  createdBeforeDays?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  order?: 'asc' | 'desc';
}

// Список пользователей с фильтрами
export const getAdminUsersApi = async (
  filter: UsersFilter,
): Promise<PaginatedResponse<AdminUser>> => {
  const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params: filter });
  return data;
};

// Детальная карточка пользователя
export const getAdminUserByIdApi = async (id: string): Promise<AdminUserProfile> => {
  const { data } = await api.get<AdminUserProfile>(`/admin/users/${id}`);
  return data;
};

// Заблокировать пользователя
export const blockUserApi = async (id: string, reason?: string): Promise<AdminUser> => {
  const { data } = await api.patch<AdminUser>(`/admin/users/${id}/block`, { reason });
  return data;
};

// Разблокировать пользователя
export const unblockUserApi = async (id: string): Promise<AdminUser> => {
  const { data } = await api.patch<AdminUser>(`/admin/users/${id}/unblock`);
  return data;
};

// Сменить роль пользователя
export const changeUserRoleApi = async (id: string, role: UserRole): Promise<AdminUser> => {
  const { data } = await api.patch<AdminUser>(`/admin/users/${id}/role`, { role });
  return data;
};

// Экспорт пользователей в CSV
export const exportUsersApi = async (filter: Omit<UsersFilter, 'page' | 'limit'>): Promise<Blob> => {
  const { data } = await api.get('/admin/users/export', {
    params: filter,
    responseType: 'blob',
  });
  return data;
};

export interface UserActivityItem {
  id: string;
  userId: string;
  action: string;
  meta: any;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Логи активности пользователя
export const getUserActivityApi = async (
  userId: string,
  params?: { page?: number; limit?: number; action?: string },
): Promise<PaginatedResponse<UserActivityItem>> => {
  const { data } = await api.get<PaginatedResponse<UserActivityItem>>(`/admin/users/${userId}/activity`, { params });
  return data;
};

// Удалить пользователя
export const deleteUserApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
};

export interface UserAuthSession { id: string; userAgent?: string; ipAddress?: string; createdAt: string; lastSeenAt: string; expiresAt: string }
export const getUserSessionsApi = async (id: string): Promise<UserAuthSession[]> => (await api.get(`/admin/users/${id}/sessions`)).data;
export const revokeUserSessionApi = async (id: string, sessionId: string): Promise<void> => { await api.delete(`/admin/users/${id}/sessions/${sessionId}`); };

