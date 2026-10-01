import { api } from './axios';

export type VisualSearchAuditOperation =
  | 'VISUAL_SEARCH'
  | 'SIMILAR_PRODUCTS'
  | 'IMAGE_EMBEDDING_REINDEX';

export interface VisualSearchAuditItem {
  id: string;
  operation: VisualSearchAuditOperation;
  timestamp: string;
  productId: string | null;
  status: 'success' | 'failed' | 'unavailable' | 'unknown';
  resultCount?: number;
  durationMs?: number;
  provider?: string;
  model?: string;
  failureCode?: string;
  embeddingStatus?: string;
}

export interface VisualSearchAuditPage {
  items: VisualSearchAuditItem[];
  page: number;
  limit: number;
  total: number;
}

const operations = new Set<VisualSearchAuditOperation>([
  'VISUAL_SEARCH',
  'SIMILAR_PRODUCTS',
  'IMAGE_EMBEDDING_REINDEX',
]);
const statuses = new Set<VisualSearchAuditItem['status']>([
  'success',
  'failed',
  'unavailable',
  'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('Invalid visual search audit response');
  return value;
}

function optionalNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid visual search audit response');
  }
  return value;
}

export function parseVisualSearchAuditPage(value: unknown): VisualSearchAuditPage {
  if (
    !isRecord(value)
    || !Array.isArray(value.items)
    || typeof value.page !== 'number'
    || typeof value.limit !== 'number'
    || typeof value.total !== 'number'
  ) {
    throw new Error('Invalid visual search audit response');
  }

  const items = value.items.map((item): VisualSearchAuditItem => {
    if (
      !isRecord(item)
      || typeof item.id !== 'string'
      || typeof item.operation !== 'string'
      || !operations.has(item.operation as VisualSearchAuditOperation)
      || typeof item.timestamp !== 'string'
      || typeof item.status !== 'string'
      || !statuses.has(item.status as VisualSearchAuditItem['status'])
      || !(item.productId === null || typeof item.productId === 'string')
    ) {
      throw new Error('Invalid visual search audit response');
    }
    return {
      id: item.id,
      operation: item.operation as VisualSearchAuditOperation,
      timestamp: item.timestamp,
      productId: item.productId,
      status: item.status as VisualSearchAuditItem['status'],
      ...(optionalNumber(item, 'resultCount') !== undefined ? { resultCount: optionalNumber(item, 'resultCount') } : {}),
      ...(optionalNumber(item, 'durationMs') !== undefined ? { durationMs: optionalNumber(item, 'durationMs') } : {}),
      ...(optionalString(item, 'provider') ? { provider: optionalString(item, 'provider') } : {}),
      ...(optionalString(item, 'model') ? { model: optionalString(item, 'model') } : {}),
      ...(optionalString(item, 'failureCode') ? { failureCode: optionalString(item, 'failureCode') } : {}),
      ...(optionalString(item, 'embeddingStatus') ? { embeddingStatus: optionalString(item, 'embeddingStatus') } : {}),
    };
  });
  return { items, page: value.page, limit: value.limit, total: value.total };
}

export async function getVisualSearchAuditApi(page: number, limit: number): Promise<VisualSearchAuditPage> {
  const { data } = await api.get<unknown>('/api/v1/admin/visual-search/audit', {
    params: { page, limit },
  });
  return parseVisualSearchAuditPage(data);
}
