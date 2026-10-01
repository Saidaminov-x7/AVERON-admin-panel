// src/lib/mediaApi.ts
// API для работы с медиа-библиотекой платформы

import { api } from './axios';

export interface MediaItem {
  id: string;
  url: string;
  ownerId: string;
  listingId?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  hash: string;
  createdAt: string;
  updatedAt: string;
  isNewUpload?: boolean;
}

export interface MediaListResponse {
  items: MediaItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalBytes: number;
  };
}

export const getMediaListApi = async (params: {
  page?: number;
  limit?: number;
  mimeType?: string;
} = {}): Promise<MediaListResponse> => {
  const { data } = await api.get('/media', { params });
  return data;
};

export const uploadMediaApi = async (file: File, listingId?: string): Promise<MediaItem> => {
  const formData = new FormData();
  formData.append('file', file);
  const url = listingId ? `/media/upload?listingId=${encodeURIComponent(listingId)}` : '/media/upload';
  const { data } = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const uploadProductPhotoApi = async (file: File): Promise<MediaItem> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/media/upload?purpose=productPhoto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteMediaApi = async (id: string): Promise<void> => {
  await api.delete(`/media/${id}`);
};

export const deleteUnattachedMediaApi = async (id: string): Promise<void> => {
  await api.delete(`/media/${id}?onlyIfUnattached=true`);
};

export const attachMediaToListingApi = async (mediaId: string, listingId: string): Promise<MediaItem> => {
  const { data } = await api.patch(`/media/${mediaId}/attach`, { listingId });
  return data;
};
