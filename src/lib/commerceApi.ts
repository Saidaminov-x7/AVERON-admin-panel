// src/lib/commerceApi.ts
// API-клиент для коммерческой части AVERON

import { api } from './axios';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  products: {
    published: number;
    pendingReview: number;
    rejected: number;
  };
  orders: {
    total: number;
  };
  users: {
    total: number;
  };
  finance: {
    revenue: string | number;
    netProfit: string | number;
    expenses: string | number;
  };
}

export interface ImportedProduct {
  id: string;
  originalTitle: string;
  source: string;
  sourceUrl: string;
  sourcePriceCny: string;
  suggestedPriceUzs?: string;
  expectedProfitUzs?: string;
  status: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ProductPayload {
  title: string;
  titleUz?: string;
  titleEn?: string;
  description?: string;
  sourceUrl: string;
  imageUrl?: string;
  sourcePriceCny: number;
  exchangeRate: number;
  salePriceUzs: number;
  color?: string;
  size?: string;
  publish: boolean;
}

// ─── Дашборд ──────────────────────────────────────────────────────────────────

export const getCommerceDashboard = () =>
  api.get<DashboardData>('/api/v1/admin/dashboard').then((r) => r.data);

// ─── Импорты (AI-парсер) ──────────────────────────────────────────────────────

export const getImports = (status = 'PENDING_REVIEW') =>
  api.get<ImportedProduct[]>('/api/v1/admin/imports', { params: { status } }).then((r) => r.data);

export const approveImport = (id: string, salePriceUzs: number, exchangeRate: number) =>
  api
    .post(`/api/v1/admin/imports/${id}/approve`, { salePriceUzs, exchangeRate, publish: true })
    .then((r) => r.data);

export const rejectImport = (id: string, reason: string) =>
  api.post(`/api/v1/admin/imports/${id}/reject`, { reason }).then((r) => r.data);

// ─── Товары ────────────────────────────────────────────────────────────────────

export const getProducts = (params?: { page?: number; limit?: number; q?: string }) =>
  api.get('/api/v1/products', { params: { limit: params?.limit ?? 15, page: params?.page ?? 1, q: params?.q } }).then((r) => r.data);

export const createManualProduct = (payload: ProductPayload) =>
  api.post('/api/v1/admin/products', payload).then((r) => r.data);

// ─── Заказы ────────────────────────────────────────────────────────────────────

export const getOrders = () =>
  api.get('/api/v1/admin/orders').then((r) => r.data);
