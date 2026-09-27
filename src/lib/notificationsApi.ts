// src/lib/notificationsApi.ts
// API для работы с системными уведомлениями

import { api } from './axios';

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  targetAdminId?: string | null;
  createdAt: string;
}

export const getNotificationsApi = async (): Promise<{
  items: AdminNotificationItem[];
  unreadCount: number;
}> => {
  const { data } = await api.get('/admin/notifications');
  return data;
};

export const markNotificationReadApi = async (id: string): Promise<AdminNotificationItem> => {
  const { data } = await api.patch(`/admin/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsReadApi = async (): Promise<void> => {
  await api.patch('/admin/notifications/read-all');
};
