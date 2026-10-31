// src/lib/extendedAdminApi.ts
import { api } from './axios';

// [Фича 26] System Health
export interface SystemHealthData {
  status: 'HEALTHY' | 'DEGRADED';
  uptimeSeconds: number;
  backend: { status: string; latencyMs: number };
  database: { status: string; latencyMs: number };
  redis: { status: string; latencyMs: number };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapUsagePercent: number;
  };
  nodeVersion: string;
  timestamp: string;
}

export const getSystemHealthApi = async (): Promise<SystemHealthData> => {
  const { data } = await api.get<SystemHealthData>('/admin/system/health');
  return data;
};

// [Фича 27] Webhooks
export interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
  createdAt: string;
}

export const getWebhooksApi = async (): Promise<WebhookItem[]> => {
  const { data } = await api.get<WebhookItem[]>('/admin/webhooks');
  return data;
};

export const createWebhookApi = async (dto: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
}): Promise<WebhookItem> => {
  const { data } = await api.post<WebhookItem>('/admin/webhooks', dto);
  return data;
};

export const deleteWebhookApi = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await api.delete<{ success: boolean }>(`/admin/webhooks/${id}`);
  return data;
};

export const testWebhookApi = async (id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> => {
  const { data } = await api.post<{ success: boolean; statusCode?: number; error?: string }>(`/admin/webhooks/${id}/test`);
  return data;
};

export interface AdminAiMessage {
  id: string;
  role: string;
  content: string;
  model: string;
  timestamp: string;
}

export interface AdminAiSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: AdminAiMessage[];
}

export interface AdminAiSessionsResponse {
  aiSessions: AdminAiSession[];
}

export const getUserAiSessionsApi = async (userId: string): Promise<AdminAiSessionsResponse> => {
  const { data } = await api.get<AdminAiSessionsResponse>(`/admin/users/${userId}/ai-sessions`);
  return data;
};
