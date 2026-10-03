import { api } from './axios';

export interface CommercePromo {
  id: string;
  code: string;
  discountPercent: number;
  maxActivations: number | null;
  usedActivations: number;
  remainingActivations: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  status: string;
}

export interface CommercePromoUsage {
  customer: string;
  orderNumber: string;
  discountPercent: number;
  subtotalUzs: string;
  discountUzs: string;
  finalTotalUzs: string;
  usedAt: string;
}

const root = '/api/v1/admin/commerce/promo-codes';

export async function getCommercePromos() {
  const { data } = await api.get<CommercePromo[]>(root);
  return data;
}

export async function createCommercePromo(input: {
  code: string;
  discountPercent: number;
  maxActivations: number | null;
  startsAt: string | null;
  expiresAt: string | null;
}) {
  const { data } = await api.post<CommercePromo>(root, input);
  return data;
}

export async function updateCommercePromo(id: string, input: Partial<Pick<CommercePromo, 'code' | 'discountPercent' | 'maxActivations' | 'isActive' | 'startsAt' | 'expiresAt'>>) {
  const { data } = await api.patch<CommercePromo>(`${root}/${encodeURIComponent(id)}`, input);
  return data;
}

export async function getCommercePromoUsages(id: string) {
  const { data } = await api.get<CommercePromoUsage[]>(`${root}/${encodeURIComponent(id)}/usages`);
  return data;
}

export async function deleteCommercePromo(id: string): Promise<{ deleted: boolean; archived: boolean }> {
  const { data } = await api.delete<{ deleted: boolean; archived: boolean }>(`${root}/${encodeURIComponent(id)}`);
  return data;
}
