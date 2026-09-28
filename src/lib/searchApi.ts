// src/lib/searchApi.ts
import { api } from './axios';

export interface QuickProductResult {
  id: string;
  title: string;
  price?: number;
  status?: string;
}

export interface QuickUserResult {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
}

export async function searchProductsApi(q: string): Promise<QuickProductResult[]> {
  if (!q || q.trim().length < 2) return [];
  const { data } = await api.get<QuickProductResult[]>('/admin/search/quick', {
    params: { q: q.trim(), type: 'products' },
  });
  return data;
}

export async function searchUsersApi(q: string): Promise<QuickUserResult[]> {
  if (!q || q.trim().length < 2) return [];
  const { data } = await api.get<QuickUserResult[]>('/admin/search/quick', {
    params: { q: q.trim(), type: 'users' },
  });
  return data;
}
