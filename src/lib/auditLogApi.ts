// src/lib/auditLogApi.ts
// API для работы с логами действий

import { api } from './axios';

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  meta: Record<string, unknown> | null;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Получить все логи действий платформы
export const getAuditLogsApi = async (params: { page?: number; limit?: number; userId?: string } = {}): Promise<AuditLogItem[]> => {
  const { data } = await api.get('/admin/audit-logs', { params });
  return Array.isArray(data) ? data : data.items || [];
};

export const fetchAuditLogs = getAuditLogsApi;

// Получить логи действий пользователя
export const getUserAuditLogsApi = async (userId: string): Promise<AuditLogItem[]> => {
  const { data } = await api.get(`/admin/audit-logs`, { params: { userId } });
  return data;
};