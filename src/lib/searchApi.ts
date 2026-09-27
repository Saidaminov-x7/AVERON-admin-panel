// src/lib/searchApi.ts
import { api } from './axios';

export interface QuickListingResult {
  id: string;
  title: string;
  city?: string;
  price?: number;
  status?: string;
}

export interface QuickUserResult {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export async function searchListingsApi(q: string): Promise<QuickListingResult[]> {
  if (!q || q.trim().length < 2) return [];
  const { data } = await api.get<QuickListingResult[]>('/admin/search/quick', {
    params: { q: q.trim(), type: 'listings' },
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
