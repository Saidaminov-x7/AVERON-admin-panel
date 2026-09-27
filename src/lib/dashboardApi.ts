// src/lib/dashboardApi.ts
// API функции для дашборда и статистики

import { api } from './axios';

export interface OverviewStats {
  visitorsToday:     { value: number; change: number; trend: 'up' | 'down' };
  activeListings:    { value: number; change: number; trend: 'up' | 'down' };
  newUsers:          { value: number; change: number; trend: 'up' | 'down' };
  activeUsers:       { value: number; change: number; trend: 'up' | 'down' };
  blockedUsers:      { value: number; change: number; trend: 'up' | 'down' | 'neutral' };
  pendingModeration: { value: number; change: number; trend: 'up' | 'down' };
}

export interface TrafficDataPoint {
  date:          string;
  visitors:      number;
  registrations: number;
  listings:      number;
}

export interface ListingsByCityItem {
  city:  string;
  count: number;
}

export interface ActivityFeedItem {
  id:         string;
  action:     string;
  resource:   string | null;
  resourceId: string | null;
  meta:       Record<string, unknown> | null;
  actor:      { id: string; name: string; avatar: string | null } | null;
  timestamp:  string;
}

export interface TopListingItem {
  id: string;
  title: string;
  city: string;
  price: number;
  viewsCount: number;
  images: Array<{ url: string }>;
}

export interface ModerationStats {
  approved: number;
  rejected: number;
  pending: number;
  conversionRate: number;
}

export interface ComplaintItem {
  id: string;
  title: string;
  city: string;
  moderationNote: string;
  updatedAt: string;
  owner: { name: string; email: string };
}

// Метрики дашборда
export const getOverviewStatsApi = async (): Promise<OverviewStats> => {
  const { data } = await api.get<OverviewStats>('/admin/stats/overview');
  return data;
};

// Посещаемость за N дней
export const getTrafficStatsApi = async (days = 30): Promise<TrafficDataPoint[]> => {
  const { data } = await api.get<TrafficDataPoint[]>('/admin/stats/traffic', { params: { days } });
  return data;
};

// Объявления по городам
export const getListingsByCityApi = async (): Promise<ListingsByCityItem[]> => {
  const { data } = await api.get<ListingsByCityItem[]>('/admin/stats/listings-by-city');
  return data;
};

// Лента последних действий
export const getActivityFeedApi = async (): Promise<ActivityFeedItem[]> => {
  const { data } = await api.get<ActivityFeedItem[]>('/admin/stats/activity-feed');
  return data;
};

export const getTopListingsApi = async (): Promise<TopListingItem[]> => {
  const { data } = await api.get<TopListingItem[]>('/admin/stats/top-listings');
  return data;
};

export const getModerationStatsApi = async (): Promise<ModerationStats> => {
  const { data } = await api.get<ModerationStats>('/admin/stats/moderation');
  return data;
};

export const getRecentComplaintsApi = async (): Promise<ComplaintItem[]> => {
  const { data } = await api.get<ComplaintItem[]>('/admin/stats/recent-complaints');
  return data;
};
