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
export type ProductLocale = 'ru' | 'uz' | 'en';

export const isProductCountry = (value: unknown): value is ProductCountry =>
  PRODUCT_COUNTRIES.some(({ code }) => code === value);

export const getProductCountryDisplay = (country: string) => {
  const knownCountry = PRODUCT_COUNTRIES.find(({ code }) => code === country);
  return knownCountry
    ? { flag: knownCountry.flag, translationKey: knownCountry.translationKey, code: null }
    : { flag: '🏳️', translationKey: 'products.unknownCountryWithCode', code: country };
};

export interface ProductCategory {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  active?: boolean;
  parentId?: string | null;
  sortOrder?: number;
  _count?: { products: number; imports: number };
}

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
  country: string;
  source: string;
  sourceUrl?: string | null;
  categoryId?: string | null;
  translations?: Partial<Record<ProductLocale, { title?: string } | string>>;
  description?: Partial<Record<ProductLocale, string>> | null;
  images?: Array<{ id: string; mediaId?: string | null; url: string; sortOrder: number }>;
  variants?: Array<{ id: string; color?: string | null; size?: string | null }>;
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
  titleUz: string;
  titleEn: string;
  description?: string;
  descriptionUz?: string;
  descriptionEn?: string;
  sourceUrl?: string;
  images: Array<{ mediaId: string }>;
  salePriceUzs: number;
  categoryId?: string;
  color?: string;
  size?: string;
  publish: boolean;
}

export interface ProductUpdatePayload {
  title: string;
  titleUz?: string;
  titleEn?: string;
  description?: string;
  descriptionUz?: string;
  descriptionEn?: string;
  sourceUrl?: string | null;
  images?: Array<{ id: string } | { mediaId: string }>;
  salePriceUzs: number;
  country?: ProductCountry;
  categoryId?: string | null;
  color?: string;
  size?: string;
}

// ─── Дашборд ──────────────────────────────────────────────────────────────────

export const getCommerceDashboard = () =>
  api.get<DashboardData>('/api/v1/admin/dashboard').then((r) => r.data);

export const getProductCategories = () =>
  api.get<ProductCategory[]>('/api/v1/admin/categories').then((r) => r.data);

export const createProductCategory = (payload: {
  slug: string;
  name: Record<ProductLocale, string>;
  parentId?: string | null;
  sortOrder?: number;
}) => api.post<ProductCategory>('/api/v1/admin/categories', payload).then((r) => r.data);

export const updateProductCategory = (id: string, payload: {
  slug?: string;
  name?: Partial<Record<ProductLocale, string>>;
  parentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}) => api.put<ProductCategory>(`/api/v1/admin/categories/${id}`, payload).then((r) => r.data);

export const archiveProductCategory = (id: string) =>
  api.delete<ProductCategory>(`/api/v1/admin/categories/${id}`).then((r) => r.data);

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

export const updateManualProduct = (id: string, payload: ProductUpdatePayload) =>
  api.put<ProductListItem>(`/api/v1/admin/products/${id}`, payload).then((r) => r.data);

export const updateProductCountry = (id: string, country: ProductCountry) =>
  api.put<ProductListItem>(`/api/v1/admin/products/${id}`, { country }).then((r) => r.data);

// ─── Заказы ────────────────────────────────────────────────────────────────────

export const getOrders = () =>
  api.get('/api/v1/admin/orders').then((r) => r.data);
