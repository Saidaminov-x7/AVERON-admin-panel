import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }));
vi.mock('./axios', () => ({ api: { patch, post } }));

import { createManualProduct, updateOrderShipping, updateOrderStatus } from './commerceApi';

describe('admin order status API', () => {
  beforeEach(() => {
    patch.mockReset().mockResolvedValue({ data: { status: 'PAID' } });
    post.mockReset().mockResolvedValue({ data: { id: 'product-1' } });
  });

  it('sends only the requested sequential status and a trimmed optional note', async () => {
    await updateOrderStatus('AV/2026-001', 'PAID', '  Payment confirmed  ');

    expect(patch).toHaveBeenCalledWith(
      '/api/v1/admin/orders/AV%2F2026-001/status',
      { status: 'PAID', note: 'Payment confirmed' },
    );
  });

  it('omits empty notes instead of persisting whitespace', async () => {
    await updateOrderStatus('AV-2026-001', 'CONFIRMED', '   ');

    expect(patch).toHaveBeenCalledWith(
      '/api/v1/admin/orders/AV-2026-001/status',
      { status: 'CONFIRMED' },
    );
  });

  it('sends internal shipping updates to the controlled admin endpoint', async () => {
    await updateOrderShipping('AV-2026-002', {
      status: 'SHIPPED',
      trackingNumber: 'TRACK-123',
      provider: 'Local courier',
      estimatedDeliveryAt: '2026-10-08T12:00:00.000Z',
      note: '  Collected by courier  ',
    });

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/orders/AV-2026-002/shipping', {
      status: 'SHIPPED',
      trackingNumber: 'TRACK-123',
      provider: 'Local courier',
      estimatedDeliveryAt: '2026-10-08T12:00:00.000Z',
      note: '  Collected by courier  ',
    });
  });

  it('sends the stable idempotency key with a manual product create request', async () => {
    const payload = {
      title: 'Jacket', titleUz: 'Kurtka', titleEn: 'Jacket', country: 'CN' as const,
      images: [{ mediaId: 'media-1' }], salePriceUzs: 180000, publish: false,
    };

    await createManualProduct(payload, 'product-create-key');

    expect(post).toHaveBeenCalledWith('/api/v1/admin/products', payload, {
      headers: { 'Idempotency-Key': 'product-create-key' },
    });
  });
});
