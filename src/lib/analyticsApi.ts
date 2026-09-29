// src/lib/analyticsApi.ts
// API для расширенной аналитики с произвольным диапазоном дат и экспортом

import { api } from './axios';

export interface DailyStatItem {
  date: string;
  visitors: number;
  listings?: number;
  products?: number;
  registrations: number;
}

export interface CityStatItem {
  city: string;
  count: number;
}

export interface RangeAnalyticsResponse {
  from: string;
  to: string;
  summary: {
    totalVisitors: number;
    totalListings?: number;
    totalProducts?: number;
    totalUsers: number;
  };
  chartData: DailyStatItem[];
  byCity: CityStatItem[];
}

export interface VisitorsDailyItem {
  date: string;
  visitors: number;
}

export interface VisitorsStatsResponse {
  from: string;
  to: string;
  totalVisitors: number;
  daily: VisitorsDailyItem[];
}

export const getRangeAnalyticsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<RangeAnalyticsResponse> => {
  const { data } = await api.get('/analytics/admin/range', { params });
  return data;
};

export const getVisitorsStatsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<VisitorsStatsResponse> => {
  const { data } = await api.get('/analytics/admin/visitors', { params });
  return data;
};

export const exportReportUrl = (params: {
  from?: string;
  to?: string;
  type?: string;
}): string => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.type) query.set('type', params.type);
  return `${base}/analytics/admin/export?${query.toString()}`;
};

export interface FunnelAnalyticsResponse {
  views: number;
  favorites: number;
  viewingRequests: number;
  favoriteRate: number;
  viewingRate: number;
  conversionRate: number;
}

export const getFunnelAnalyticsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<FunnelAnalyticsResponse> => {
  const { data } = await api.get('/analytics/funnel', { params });
  return data;
};
