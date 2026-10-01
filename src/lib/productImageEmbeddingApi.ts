import { api } from './axios';
import { isAxiosError } from 'axios';

export type ProductImageEmbeddingStatus = 'INDEXED' | 'PENDING' | 'UNAVAILABLE' | 'FAILED';
export type ProductImageEmbeddingReindexErrorCode =
  | 'FEATURE_DISABLED'
  | 'EMBEDDING_PROVIDER_NOT_CONFIGURED';

export interface ProductImageEmbedding {
  status: ProductImageEmbeddingStatus;
  provider?: string;
  model?: string;
  embeddingVersion?: string;
  lastIndexedAt?: string;
}

export type ProductImageEmbeddingReindexResult =
  | { status: ProductImageEmbeddingStatus }
  | { code: ProductImageEmbeddingReindexErrorCode };

const statuses = new Set<ProductImageEmbeddingStatus>([
  'INDEXED',
  'PENDING',
  'UNAVAILABLE',
  'FAILED',
]);
const reindexErrorCodes = new Set<ProductImageEmbeddingReindexErrorCode>([
  'FEATURE_DISABLED',
  'EMBEDDING_PROVIDER_NOT_CONFIGURED',
]);

export function parseProductImageEmbedding(value: unknown): ProductImageEmbedding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid product image embedding response');
  }

  const source = value as Record<string, unknown>;
  if (typeof source.status !== 'string' || !statuses.has(source.status as ProductImageEmbeddingStatus)) {
    throw new Error('Invalid product image embedding response');
  }

  const parsed: ProductImageEmbedding = {
    status: source.status as ProductImageEmbeddingStatus,
  };
  for (const field of ['provider', 'model', 'embeddingVersion', 'lastIndexedAt'] as const) {
    const item = source[field];
    if (item !== undefined) {
      if (item !== null) {
        if (typeof item !== 'string') throw new Error('Invalid product image embedding response');
        parsed[field] = item;
      }
    }
  }
  return parsed;
}

export function parseProductImageEmbeddingReindexResult(
  value: unknown,
): ProductImageEmbeddingReindexResult {
  if (typeof value === 'string' && statuses.has(value as ProductImageEmbeddingStatus)) {
    return { status: value as ProductImageEmbeddingStatus };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid product image embedding reindex response');
  }

  const source = value as Record<string, unknown>;
  if (typeof source.code === 'string' && reindexErrorCodes.has(source.code as ProductImageEmbeddingReindexErrorCode)) {
    return { code: source.code as ProductImageEmbeddingReindexErrorCode };
  }
  if (typeof source.status === 'string' && statuses.has(source.status as ProductImageEmbeddingStatus)) {
    return { status: source.status as ProductImageEmbeddingStatus };
  }
  throw new Error('Invalid product image embedding reindex response');
}

export async function getProductImageEmbeddingApi(
  productId: string,
  signal?: AbortSignal,
): Promise<ProductImageEmbedding> {
  const { data } = await api.get<unknown>(
    `/api/v1/admin/products/${encodeURIComponent(productId)}/image-embedding`,
    { signal },
  );
  return parseProductImageEmbedding(data);
}

export async function reindexProductImageEmbeddingApi(
  productId: string,
): Promise<ProductImageEmbeddingReindexResult> {
  try {
    const { data } = await api.post<unknown>(
      `/api/v1/admin/products/${encodeURIComponent(productId)}/image-embedding/reindex`,
    );
    return parseProductImageEmbeddingReindexResult(data);
  } catch (error) {
    if (isAxiosError(error)) {
      try {
        const result = parseProductImageEmbeddingReindexResult(error.response?.data);
        if ('code' in result) return result;
      } catch {
        // Preserve the original request error for unexpected responses.
      }
    }
    throw error;
  }
}
