// src/lib/listingsApi.ts
// API функции для управления объявлениями и жалобами (admin)

import { api } from './axios';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type PromotionTier = 'BASIC' | 'TOP' | 'URGENT';
export type ReportReason = 'SCAM' | 'ALREADY_RENTED' | 'WRONG_PRICE' | 'WRONG_PHOTOS' | 'DUPLICATE' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface AdminListing {
  id:               string;
  title:            string;
  description:      string;
  price:            string;
  type:             string;
  rooms:            number;
  area:             string;
  city:             string;
  district:         string;
  address:          string | null;
  status:           ListingStatus;
  moderationStatus: ModerationStatus;
  moderationNote:   string | null;
  viewsCount:       number;
  isPromoted?:      boolean;
  promotionTier?:   PromotionTier | null;
  promotedUntil?:   string | null;
  isVerified?:      boolean;
  verifiedAt?:      string | null;
  verifiedBy?:      string | null;
  createdAt:        string;
  updatedAt:        string;
  owner: {
    id:     string;
    name:   string;
    email:  string;
    phone:  string;
    avatar: string | null;
  };
  images: { id: string; url: string }[];
  _count: { favorites: number };
}

export interface ListingsFilter {
  page?:             number;
  limit?:            number;
  status?:           ListingStatus;
  moderationStatus?: ModerationStatus;
  city?:             string;
  ownerId?:          string;
  dateFrom?:         string;
  dateTo?:           string;
  sortBy?:           string;
  sortOrder?:        'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

export interface ReportItem {
  id:         string;
  listingId:  string;
  reason:     ReportReason;
  comment:    string | null;
  status:     ReportStatus;
  createdAt:  string;
  listing?: {
    id:     string;
    title:  string;
    city:   string;
    price:  string;
    status: ListingStatus;
    images: { url: string }[];
    owner:  { id: string; name: string; email: string };
  };
  reporter?: {
    id:    string;
    name:  string;
    email: string;
  } | null;
}

// Список объявлений с фильтрами
export const getAdminListingsApi = async (
  filter: ListingsFilter,
): Promise<PaginatedResponse<AdminListing>> => {
  const { data } = await api.get<PaginatedResponse<AdminListing>>('/admin/listings', { params: filter });
  return data;
};

// Одобрить объявление
export const approveListingApi = async (id: string): Promise<AdminListing> => {
  const { data } = await api.patch<AdminListing>(`/admin/listings/${id}/approve`);
  return data;
};

// Отклонить объявление
export const rejectListingApi = async (id: string, reason: string): Promise<AdminListing> => {
  const { data } = await api.patch<AdminListing>(`/admin/listings/${id}/reject`, { reason });
  return data;
};

// Запросить правки
export const requestChangesApi = async (id: string, comment: string): Promise<AdminListing> => {
  const { data } = await api.patch<AdminListing>(`/admin/listings/${id}/request-changes`, { comment });
  return data;
};

// Верификация "Проверено Ijarauz"
export const verifyListingApi = async (id: string, isVerified = true): Promise<AdminListing> => {
  const { data } = await api.patch<AdminListing>(`/admin/listings/${id}/verify`, { isVerified });
  return data;
};

// Удалить объявление (soft delete)
export const deleteListingApi = async (id: string): Promise<void> => {
  await api.delete(`/admin/listings/${id}`);
};

// Получить список жалоб
export const getReportsApi = async (params: {
  status?: ReportStatus;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResponse<ReportItem>> => {
  const { data } = await api.get<PaginatedResponse<ReportItem>>('/admin/reports', { params });
  return data;
};

// Обновить статус жалобы
export const updateReportStatusApi = async (
  id: string,
  status: ReportStatus,
): Promise<ReportItem> => {
  const { data } = await api.patch<ReportItem>(`/admin/reports/${id}/status`, { status });
  return data;
};

export type ViewingStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED';

export interface ViewingRequestItem {
  id: string;
  listingId: string;
  status: ViewingStatus;
  preferredDate: string | null;
  message: string | null;
  createdAt: string;
  listing: { id: string; title: string; ownerId: string };
  requester: { id: string; name: string; phone: string; email: string };
}

export const getViewingRequestsApi = async (): Promise<ViewingRequestItem[]> => {
  const { data } = await api.get<ViewingRequestItem[]>('/admin/viewing-requests');
  return data;
};

export const updateViewingStatusApi = async (
  id: string,
  status: ViewingStatus,
): Promise<ViewingRequestItem> => {
  const { data } = await api.patch<ViewingRequestItem>(`/viewing-requests/${id}/status`, { status });
  return data;
};
