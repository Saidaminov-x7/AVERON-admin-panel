import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './axios';
import { getVisualSearchAuditApi, parseVisualSearchAuditPage } from './visualSearchAuditApi';

vi.mock('./axios', () => ({
  api: { get: vi.fn() },
}));

describe('visual search audit API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses safe audit metadata without accepting raw embedding fields', () => {
    const audit = {
      items: [{
        id: 'event-1',
        operation: 'SIMILAR_PRODUCTS',
        timestamp: '2026-10-01T12:00:00.000Z',
        productId: 'product-1',
        status: 'success',
        resultCount: 4,
        durationMs: 52,
        provider: 'configured-provider',
        model: 'model-v1',
        embeddingStatus: 'INDEXED',
      }],
      page: 1,
      limit: 25,
      total: 1,
    };

    expect(parseVisualSearchAuditPage(audit).items[0]).not.toHaveProperty('embedding');
    expect(parseVisualSearchAuditPage(audit).items[0]).toMatchObject({
      operation: 'SIMILAR_PRODUCTS',
      resultCount: 4,
      embeddingStatus: 'INDEXED',
    });
    expect(() => parseVisualSearchAuditPage({
      ...audit,
      items: [{ ...audit.items[0], operation: 'UNKNOWN', embedding: [0.1] }],
    })).toThrow();
  });

  it('requests a bounded page and parses controlled empty results', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], page: 2, limit: 25, total: 0 },
    } as never);

    await expect(getVisualSearchAuditApi(2, 25)).resolves.toEqual({
      items: [],
      page: 2,
      limit: 25,
      total: 0,
    });
    expect(api.get).toHaveBeenCalledWith('/api/v1/admin/visual-search/audit', {
      params: { page: 2, limit: 25 },
    });
  });
});
