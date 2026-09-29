// src/lib/pagesApi.ts
// API функции для управления динамическими страницами

import { api } from './axios';
import type { PaginatedResponse } from './usersApi';

export interface DynamicPage {
  id:          string;
  slug:        string;
  title:       string;
  content:     string;
  locale:      'ru' | 'uz' | 'en';
  isPublished: boolean;
  isUnderMaintenance: boolean;
  createdAt:   string;
  updatedAt:   string;
  author:      { id: string; name: string } | null;
}

export interface CreatePageDto {
  slug:        string;
  title:       string;
  content:     string;
  locale:      'ru' | 'uz' | 'en';
  isPublished: boolean;
}

// Список всех страниц
export const getPagesApi = async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<DynamicPage>> => {
  const { data } = await api.get<PaginatedResponse<DynamicPage>>('/admin/pages', { params });
  return data;
};

// Одна страница по ID
export const getPageByIdApi = async (id: string): Promise<DynamicPage> => {
  const { data } = await api.get<DynamicPage>(`/admin/pages/${id}`);
  return data;
};

// Создать страницу
export const createPageApi = async (dto: CreatePageDto): Promise<DynamicPage> => {
  const { data } = await api.post<DynamicPage>('/admin/pages', dto);
  return data;
};

// Обновить страницу
export const updatePageApi = async (id: string, dto: Partial<CreatePageDto>): Promise<DynamicPage> => {
  const { data } = await api.patch<DynamicPage>(`/admin/pages/${id}`, dto);
  return data;
};

// Удалить страницу
export const deletePageApi = async (id: string): Promise<void> => {
  await api.delete(`/admin/pages/${id}`);
};
