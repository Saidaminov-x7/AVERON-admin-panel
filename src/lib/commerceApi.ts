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
export type ProductSource = 'SOURCE_1688' | 'TAOBAO' | 'ALIBABA' | 'ALIEXPRESS' | 'MANUAL';

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
  source: ProductSource;
  sourceUrl: string;
  sourcePriceCny: string | null;
  suggestedPriceUzs?: string;
  expectedProfitUzs?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  sourceMetadata?: Record<string, unknown> | null;
  normalizedPayload?: {
    schemaVersion?: number;
    provider?: string;
    country?: string;
    sourceDescription?: string | null;
    sourceImages?: Array<string | { url?: string }>;
    sourceCategory?: string | null;
    sourcePriceCurrency?: string | null;
    sourceAttributes?: Record<string, string | string[]>;
    variants?: Array<{ sourceVariantId?: string; color?: string; size?: string; sourcePriceCny?: number }>;
    sizes?: string[];
    fetchedAt?: string;
    rawMetadata?: Record<string, unknown>;
    images?: Array<string | { url?: string }>;
  } | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  rejectionReason?: string | null;
  product?: { id: string; status: ProductListItem['status'] } | null;
}

export interface ImportedProductListResponse {
  items: ImportedProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductListItem {
  id: string;
  slug: string;
  publicId?: string | null;
  sizeChartType?: 'CLOTHING' | 'SHOES' | 'KIDS_CLOTHING' | null;
  country: string;
  source: string;
  sourceProductId?: string;
  sourceUrl?: string | null;
  importedFrom?: {
    originalTitle: string;
    status: string;
    source: string;
  } | null;
  categoryId?: string | null;
  category?: ProductCategory | null;
  translations?: Partial<Record<ProductLocale, { title?: string } | string>>;
  description?: Partial<Record<ProductLocale, string>> | null;
  images?: Array<{ id: string; mediaId?: string | null; url: string; sortOrder: number }>;
  variants?: Array<{ id: string; color?: string | null; size?: string | null; stock?: number; available?: boolean }>;
  salePriceUzs: string | number;
  compareAtPriceUzs?: string | number | null;
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
  sizeChartType?: 'CLOTHING' | 'SHOES' | 'KIDS_CLOTHING' | null;
  titleUz: string;
  titleEn: string;
  description?: string;
  descriptionUz?: string;
  descriptionEn?: string;
  sourceUrl?: string;
  images: Array<{ mediaId: string }>;
  salePriceUzs: number;
  compareAtPriceUzs?: number | null;
  categoryId?: string;
  color?: string;
  colors?: Array<{ name: string; hex: string }>;
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
  compareAtPriceUzs?: number | null;
  country?: ProductCountry;
  sizeChartType?: 'CLOTHING' | 'SHOES' | 'KIDS_CLOTHING' | null;
  categoryId?: string | null;
  publish?: boolean;
  color?: string;
  colors?: Array<{ name: string; hex: string }>;
  size?: string;
}

// ─── Дашборд ──────────────────────────────────────────────────────────────────

export const getCommerceDashboard = () =>
  api.get<DashboardData>('/api/v1/admin/dashboard').then((r) => r.data);

export const getProductCategories = () =>
  api.get<ProductCategory[]>('/api/v1/admin/categories').then((r) => r.data);

export const createProductCategory = (payload: {
  slug?: string;
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

export const getImports = (params: {
  status?: ImportedProduct['status'];
  provider?: string;
  country?: ProductCountry;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) =>
  api.get<ImportedProductListResponse>('/api/v1/admin/imports', { params }).then((r) => r.data);

export const approveImport = (
  id: string,
  payload: {
    translations: Partial<Record<ProductLocale, { title?: string; description?: string }>>;
    salePriceUzs: number;
    exchangeRate?: number;
    country: ProductCountry;
    sizeChartType?: 'CLOTHING' | 'SHOES' | 'KIDS_CLOTHING' | null;
    mediaIds?: string[];
    publish: boolean;
  },
) =>
  api.post(`/api/v1/admin/imports/${id}/approve`, payload).then((r) => r.data);

export const rejectImport = (id: string, reason: string) =>
  api.post(`/api/v1/admin/imports/${id}/reject`, { reason }).then((r) => r.data);

// ─── Товары ────────────────────────────────────────────────────────────────────

export const getProducts = (params?: {
  page?: number;
  limit?: number;
  q?: string;
  country?: ProductCountry;
  category?: string;
  status?: ProductListItem['status'];
  source?: ProductSource;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}) =>
  api.get<ProductListResponse>('/api/v1/admin/products', {
    params: {
      limit: params?.limit ?? 15,
      page: params?.page ?? 1,
      q: params?.q,
      category: params?.category || undefined,
      status: params?.status,
      source: params?.source,
      sort: params?.sort,
      ...(isProductCountry(params?.country) ? { country: params.country } : {}),
    },
  }).then((r) => r.data);

export const createManualProduct = (payload: ProductPayload) =>
  api.post<ProductListItem>('/api/v1/admin/products', payload).then((r) => r.data);

export const updateManualProduct = (id: string, payload: ProductUpdatePayload) =>
  api.put<ProductListItem>(`/api/v1/admin/products/${id}`, payload).then((r) => r.data);

export const archiveProduct = (id: string) =>
  api.post<ProductListItem>(`/api/v1/admin/products/${id}/archive`).then((r) => r.data);

export const restoreProduct = (id: string) =>
  api.post<ProductListItem>(`/api/v1/admin/products/${id}/restore`).then((r) => r.data);

export const deleteProductPermanently = (id: string) =>
  api.delete<ProductListItem>(`/api/v1/admin/products/${id}`).then((r) => r.data);

export const publishProductToTelegram = (id: string) =>
  api.post<{ status: string; telegramMessageId: string; publishedAt: string }>(
    `/api/v1/admin/products/${encodeURIComponent(id)}/telegram-publish`,
    {},
  ).then((response) => response.data);

export const updateProductCountry = (id: string, country: ProductCountry) =>
  api.put<ProductListItem>(`/api/v1/admin/products/${id}`, { country }).then((r) => r.data);

// ─── Заказы ────────────────────────────────────────────────────────────────────

export type CommerceOrderStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PAID'
  | 'ORDERED_FROM_SUPPLIER'
  | 'SUPPLIER_CONFIRMED'
  | 'IN_TRANSIT_CHINA'
  | 'CARGO_WAREHOUSE'
  | 'INTERNATIONAL_TRANSIT'
  | 'ARRIVED_UZBEKISTAN'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REFUNDED';

export type CommerceOrderTransition =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PAID'
  | 'ORDERED_FROM_SUPPLIER'
  | 'SUPPLIER_CONFIRMED'
  | 'IN_TRANSIT_CHINA'
  | 'CARGO_WAREHOUSE'
  | 'INTERNATIONAL_TRANSIT'
  | 'ARRIVED_UZBEKISTAN'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED';

export type CommerceDeliveryStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CommerceOrderStatusHistoryEntry {
  status: CommerceOrderStatus;
  note: string | null;
  createdAt: string;
}

export interface CommerceDeliveryHistoryEntry {
  status: CommerceDeliveryStatus;
  note?: string | null;
  createdAt: string;
}

export interface CommerceOrderDelivery {
  method: 'COURIER' | 'PICKUP';
  recipient: string;
  phone: string;
  destination: Record<string, unknown>;
  status: CommerceDeliveryStatus;
  trackingNumber: string | null;
  provider: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  history: CommerceDeliveryHistoryEntry[];
}

export interface CommerceOrderShipment {
  provider: string;
  trackingNumber: string;
  status: string;
  sentAt: string | null;
  arrivedAt: string | null;
}

export interface CommerceOrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  variantSnapshot?: { color: string | null; size: string | null; sku: string } | null;
  isPreorder?: boolean;
  preorderEstimatedAt?: string | null;
}

export interface CommerceOrder {
  orderNumber: string;
  status: CommerceOrderStatus;
  currency: 'UZS';
  subtotal: string | number;
  discount: string | number;
  deliveryCost: string | number;
  totalRevenue: string | number;
  contact: unknown;
  deliveryAddress: unknown;
  items: CommerceOrderItem[];
  statusHistory: CommerceOrderStatusHistoryEntry[];
  shipments: CommerceOrderShipment[];
  delivery?: CommerceOrderDelivery | null;
  createdAt: string;
  updatedAt: string;
}

export const getOrders = () =>
  api.get<CommerceOrder[]>('/api/v1/admin/orders').then((r) => r.data);

export const getOrder = (orderNumber: string) =>
  api.get<CommerceOrder>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}`).then((r) => r.data);

export const updateOrderStatus = (
  orderNumber: string,
  status: CommerceOrderTransition,
  note?: string,
) =>
  api.patch<CommerceOrder>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    { status, ...(note?.trim() ? { note: note.trim() } : {}) },
  )
    .then((r) => r.data);

export const updateOrderShipping = (
  orderNumber: string,
  payload: {
    status: CommerceDeliveryStatus;
    trackingNumber?: string | null;
    provider?: string | null;
    estimatedDeliveryAt?: string | null;
    note?: string;
  },
) =>
  api.patch<CommerceOrder>(
    `/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/shipping`,
    payload,
  ).then((r) => r.data);
