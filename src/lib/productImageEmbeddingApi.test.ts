import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './axios';
import {
  getProductImageEmbeddingApi,
  parseProductImageEmbedding,
  parseProductImageEmbeddingReindexResult,
  reindexProductImageEmbeddingApi,
} from './productImageEmbeddingApi';

vi.mock('./axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('product image embedding API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only the documented status metadata and never exposes vectors', async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({
      data: {
        status: 'INDEXED',
        provider: 'test-provider',
        model: 'model-v1',
        embeddingVersion: 'v1',
        lastIndexedAt: '2026-09-30T10:00:00.000Z',
        vector: [0.1, 0.2],
      },
    });

    await expect(getProductImageEmbeddingApi('product/1', signal)).resolves.toEqual({
      status: 'INDEXED',
      provider: 'test-provider',
      model: 'model-v1',
      embeddingVersion: 'v1',
      lastIndexedAt: '2026-09-30T10:00:00.000Z',
    });
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/admin/products/product%2F1/image-embedding',
      { signal },
    );
  });

  it.each(['INDEXED', 'PENDING', 'UNAVAILABLE', 'FAILED'] as const)(
    'accepts the %s status',
    (status) => {
      expect(parseProductImageEmbedding({ status })).toEqual({ status });
    },
  );

  it('rejects malformed statuses and metadata', () => {
    expect(() => parseProductImageEmbedding({ status: 'UNKNOWN' })).toThrow();
    expect(() => parseProductImageEmbedding({ status: 'INDEXED', model: 7 })).toThrow();
    expect(() => parseProductImageEmbedding({ vector: [0.1] })).toThrow();
    expect(parseProductImageEmbedding({ status: 'PENDING', provider: null })).toEqual({
      status: 'PENDING',
    });
  });

  it('posts a reindex request and parses successful statuses', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'PENDING' } });

    await expect(reindexProductImageEmbeddingApi('product-1')).resolves.toEqual({
      status: 'PENDING',
    });
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/products/product-1/image-embedding/reindex',
    );
    expect(parseProductImageEmbeddingReindexResult('INDEXED')).toEqual({ status: 'INDEXED' });
  });

  it.each([
    'FEATURE_DISABLED',
    'EMBEDDING_PROVIDER_NOT_CONFIGURED',
  ] as const)('accepts controlled %s reindex responses', (code) => {
    expect(parseProductImageEmbeddingReindexResult({ code })).toEqual({ code });
  });

  it('returns controlled errors delivered with an HTTP error response', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'EMBEDDING_PROVIDER_NOT_CONFIGURED' } },
    });

    await expect(reindexProductImageEmbeddingApi('product-1')).resolves.toEqual({
      code: 'EMBEDDING_PROVIDER_NOT_CONFIGURED',
    });
  });

  it('rejects unrecognized controlled errors and malformed reindex responses', () => {
    expect(() => parseProductImageEmbeddingReindexResult({ code: 'OTHER' })).toThrow();
    expect(() => parseProductImageEmbeddingReindexResult({ status: 'UNKNOWN' })).toThrow();
  });
});
