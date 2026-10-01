// src/lib/commerceApi.ts
// API-клиент для коммерческой части AVERON

import { api } from './axios';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export const PRODUCT_COUNTRIES = [
  { code: 'CN', flag: '🇨🇳', translationKey: 'products.countryChina' },
  { code: 'US', flag: '🇺🇸', translationKey: 'products.countryUnitedStates' },
  { code: 'TR', flag: '🇹🇷', translationKey: 'products.countryTurkey' },
  { code: 'IT', flag: '🇮🇹', translationKey: 'products.countryItaly' },
  { code: 'GB', flag: '🇬🇧', translationKey: 'products.countryUnitedKingdom' },
] as const;

export type ProductCountry = typeof PRODUCT_COUNTRIES[number]['code'];

export const isProductCountry = (value: unknown): value is ProductCountry =>
  PRODUCT_COUNTRIES.some(({ code }) => code === value);

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

export interface ProductListItem {
  id: string;
  slug: string;
  country: ProductCountry;
  translations?: {
    ru?: { title?: string };
  };
  images?: Array<{ url: string }>;
  salePriceUzs: string | number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface ProductListResponse {
  items: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductPayload {
  title: string;
  country: ProductCountry;
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

export const approveImport = (
  id: string,
  salePriceUzs: number,
  exchangeRate: number,
  country: ProductCountry,
) =>
  api
    .post(`/api/v1/admin/imports/${id}/approve`, { salePriceUzs, exchangeRate, country, publish: true })
    .then((r) => r.data);

export const rejectImport = (id: string, reason: string) =>
  api.post(`/api/v1/admin/imports/${id}/reject`, { reason }).then((r) => r.data);

// ─── Товары ────────────────────────────────────────────────────────────────────

export const getProducts = (params?: {
  page?: number;
  limit?: number;
  q?: string;
  country?: ProductCountry;
}) =>
  api.get<ProductListResponse>('/api/v1/admin/products', {
    params: {
      limit: params?.limit ?? 15,
      page: params?.page ?? 1,
      q: params?.q,
      ...(isProductCountry(params?.country) ? { country: params.country } : {}),
    },
  }).then((r) => r.data);

export const createManualProduct = (payload: ProductPayload) =>
  api.post('/api/v1/admin/products', payload).then((r) => r.data);

export const updateProductCountry = (id: string, country: ProductCountry) =>
  api.put<ProductListItem>(`/api/v1/admin/products/${id}`, { country }).then((r) => r.data);

// ─── Заказы ────────────────────────────────────────────────────────────────────

export const getOrders = () =>
  api.get('/api/v1/admin/orders').then((r) => r.data);
