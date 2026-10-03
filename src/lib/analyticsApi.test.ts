import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadAnalyticsReportApi,
  parseFunnelAnalyticsResponse,
  parseRangeAnalyticsResponse,
} from './analyticsApi';
import { api } from './axios';

vi.mock('./axios', () => ({
  api: { get: vi.fn() },
}));

describe('analytics export API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('downloads a report through the authenticated API client as a Blob', async () => {
    const blob = new Blob(['date,revenue\n']);
    vi.mocked(api.get).mockResolvedValue({ data: blob });

    await expect(downloadAnalyticsReportApi({
      from: '2025-01-01',
      to: '2025-01-31',
      type: 'traffic',
    })).resolves.toBe(blob);

    expect(api.get).toHaveBeenCalledWith('/analytics/admin/export', {
      params: { from: '2025-01-01', to: '2025-01-31', type: 'traffic' },
      responseType: 'blob',
    });
  });

  it('normalizes partial analytics responses and ignores malformed chart rows', () => {
    expect(parseRangeAnalyticsResponse({
      summary: { totalVisitors: 12, revenueUzs: null },
      chartData: [
        { date: '2025-01-01', visitors: 3, products: 'invalid' },
        { date: 'invalid-date', visitors: 9 },
        null,
      ],
    })).toEqual({
      from: '',
      to: '',
      summary: {
        totalVisitors: 12,
        totalProducts: undefined,
        totalPaidOrders: undefined,
        revenueUzs: undefined,
        totalUsers: undefined,
      },
      chartData: [{
        date: '2025-01-01',
        visitors: 3,
        products: undefined,
        registrations: undefined,
        paidOrders: undefined,
        revenueUzs: undefined,
      }],
    });
    expect(parseFunnelAnalyticsResponse({ visits: 12, favoriteRate: null })).toEqual({
      visits: 12,
      favorites: undefined,
      favoriteRate: undefined,
      paidOrders: undefined,
      orderRate: undefined,
    });
  });
});
