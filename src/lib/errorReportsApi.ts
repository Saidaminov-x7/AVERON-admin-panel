// src/lib/errorReportsApi.ts
import { api } from './axios';
import type { PaginatedResponse } from './usersApi';


export interface ClientErrorReportItem {
  id: string;
  message: string;
  stack?: string | null;
  url: string;
  userAgent?: string | null;
  userId?: string | null;
  severity: 'error' | 'warning' | 'info';
  ip?: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface ErrorReportsFilter {
  page?: number;
  limit?: number;
  severity?: 'error' | 'warning' | 'info';
  resolved?: boolean;
}

export const getErrorReportsApi = async (
  filter: ErrorReportsFilter,
): Promise<PaginatedResponse<ClientErrorReportItem>> => {
  const { data } = await api.get<PaginatedResponse<ClientErrorReportItem>>('/error-reports', {
    params: filter,
  });
  return data;
};

export const resolveErrorReportApi = async (id: string): Promise<{ success: boolean; item: ClientErrorReportItem }> => {
  const { data } = await api.patch<{ success: boolean; item: ClientErrorReportItem }>(`/error-reports/${id}/resolve`);
  return data;
};
