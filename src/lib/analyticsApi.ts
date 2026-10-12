// src/lib/analyticsApi.ts
// API для расширенной аналитики с произвольным диапазоном дат и экспортом

import { api } from './axios';

export interface DailyStatItem {
  date: string;
  visitors?: number;
  products?: number;
  registrations?: number;
  paidOrders?: number;
  revenueUzs?: number;
}

export interface RangeAnalyticsResponse {
  from: string;
  to: string;
  summary: {
    totalVisitors?: number;
    totalProducts?: number;
    totalPaidOrders?: number;
    revenueUzs?: number;
    totalUsers?: number;
  };
  chartData: DailyStatItem[];
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
  const { data } = await api.get<unknown>('/analytics/admin/range', { params });
  return parseRangeAnalyticsResponse(data);
};

export const getVisitorsStatsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<VisitorsStatsResponse> => {
  const { data } = await api.get('/analytics/admin/visitors', { params });
  return data;
};

export const downloadAnalyticsReportApi = async (params: {
  from?: string;
  to?: string;
  type?: string;
}): Promise<Blob> => {
  const { data } = await api.get<Blob>('/analytics/admin/export', {
    params,
    responseType: 'blob',
  });
  return data;
};

export interface FunnelAnalyticsResponse {
  visits?: number;
  favorites?: number;
  favoriteRate?: number;
  paidOrders?: number;
  orderRate?: number;
}

export interface CustomerJourneyResponse {
  firstTimeVisitors: number;
  buyers: number;
  conversionRate: number;
  avgDaysToFirstPurchase: number;
  avgProductsInFirstOrder: number;
  matureVisitors: number;
  day3Buyers: number;
  day3ConversionRate: number;
  daily: Array<{ day: string; purchases: number; units: number; revenueUzs: number }>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string => typeof value === 'string' ? value : '';

export const parseRangeAnalyticsResponse = (value: unknown): RangeAnalyticsResponse => {
  const source = asRecord(value);
  const rawSummary = asRecord(source.summary);
  const chartData = Array.isArray(source.chartData)
    ? source.chartData.flatMap((item): DailyStatItem[] => {
      const row = asRecord(item);
      if (typeof row.date !== 'string' || Number.isNaN(Date.parse(row.date))) return [];
      return [{
        date: row.date,
        visitors: asFiniteNumber(row.visitors),
        products: asFiniteNumber(row.products),
        registrations: asFiniteNumber(row.registrations),
        paidOrders: asFiniteNumber(row.paidOrders),
        revenueUzs: asFiniteNumber(row.revenueUzs),
      }];
    })
    : [];

  return {
    from: asString(source.from),
    to: asString(source.to),
    summary: {
      totalVisitors: asFiniteNumber(rawSummary.totalVisitors),
      totalProducts: asFiniteNumber(rawSummary.totalProducts),
      totalPaidOrders: asFiniteNumber(rawSummary.totalPaidOrders),
      revenueUzs: asFiniteNumber(rawSummary.revenueUzs),
      totalUsers: asFiniteNumber(rawSummary.totalUsers),
    },
    chartData,
  };
};

export const parseFunnelAnalyticsResponse = (value: unknown): FunnelAnalyticsResponse => {
  const source = asRecord(value);
  return {
    visits: asFiniteNumber(source.visits),
    favorites: asFiniteNumber(source.favorites),
    favoriteRate: asFiniteNumber(source.favoriteRate),
    paidOrders: asFiniteNumber(source.paidOrders),
    orderRate: asFiniteNumber(source.orderRate),
  };
};

export const getFunnelAnalyticsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<FunnelAnalyticsResponse> => {
  const { data } = await api.get<unknown>('/analytics/funnel', { params });
  return parseFunnelAnalyticsResponse(data);
};

export const parseCustomerJourneyResponse = (value: unknown): CustomerJourneyResponse => {
  const source = asRecord(value);
  const daily = Array.isArray(source.daily) ? source.daily.flatMap((value) => {
    const row = asRecord(value);
    if (typeof row.day !== 'string') return [];
    return [{
      day: row.day,
      purchases: asFiniteNumber(row.purchases) ?? 0,
      units: asFiniteNumber(row.units) ?? 0,
      revenueUzs: asFiniteNumber(row.revenueUzs) ?? 0,
    }];
  }) : [];
  return {
    firstTimeVisitors: asFiniteNumber(source.firstTimeVisitors) ?? 0,
    buyers: asFiniteNumber(source.buyers) ?? 0,
    conversionRate: asFiniteNumber(source.conversionRate) ?? 0,
    avgDaysToFirstPurchase: asFiniteNumber(source.avgDaysToFirstPurchase) ?? 0,
    avgProductsInFirstOrder: asFiniteNumber(source.avgProductsInFirstOrder) ?? 0,
    matureVisitors: asFiniteNumber(source.matureVisitors) ?? 0,
    day3Buyers: asFiniteNumber(source.day3Buyers) ?? 0,
    day3ConversionRate: asFiniteNumber(source.day3ConversionRate) ?? 0,
    daily,
  };
};

export const getCustomerJourneyAnalyticsApi = async (params: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<CustomerJourneyResponse> => {
  const { data } = await api.get<unknown>('/analytics/admin/journey', { params });
  return parseCustomerJourneyResponse(data);
};
