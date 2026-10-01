import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrdersPage from './OrdersPage';
import type { CommerceOrder } from '../../lib/commerceApi';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('main', null, children),
}));
vi.mock('../../components/ui/Modal', () => ({
  Modal: () => null,
}));
vi.mock('../../components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));
vi.mock('../../components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) =>
    createElement('section', null, createElement('h2', null, title), createElement('p', null, description)),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const order: CommerceOrder = {
  orderNumber: 'AV-20261001-ABC123',
  status: 'CREATED',
  currency: 'UZS',
  subtotal: '250000',
  discount: '0',
  deliveryCost: '0',
  totalRevenue: '250000',
  contact: { name: 'A Customer', phone: '+998901234567' },
  deliveryAddress: { city: 'Tashkent', address: 'Amir Temur 1' },
  items: [{
    id: 'item-1',
    title: 'Blue dress',
    quantity: 2,
    unitPrice: '125000',
    totalPrice: '250000',
    variantSnapshot: { color: 'Blue', size: 'M', sku: 'DRESS-M' },
  }],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function renderPage() {
  return renderToStaticMarkup(createElement(OrdersPage));
}

describe('Admin order management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn(),
    } as never);
    vi.mocked(useMutation).mockReturnValue({ isPending: false, mutate: vi.fn() } as never);
    vi.mocked(useQuery).mockImplementation(({ queryKey }) => ({
      data: queryKey[0] === 'commerce-orders' ? [order] : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never));
  });

  it('renders searchable customer orders with server totals and status', () => {
    const markup = renderPage();

    expect(markup).toContain('Order number or customer');
    expect(markup).toContain('#AV-20261001-ABC123');
    expect(markup).toContain('A Customer');
    expect(markup).toContain('Created');
    expect(markup).toContain('250,000 UZS');
    expect(markup).toContain('View details');
  });

  it('renders loading, error, and empty states accessibly', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }) => ({
      data: undefined,
      isLoading: queryKey[0] === 'commerce-orders',
      isError: false,
      refetch: vi.fn(),
    } as never));
    expect(renderPage()).toContain('role="status"');

    vi.mocked(useQuery).mockImplementation(({ queryKey }) => ({
      data: undefined,
      isLoading: false,
      isError: queryKey[0] === 'commerce-orders',
      refetch: vi.fn(),
    } as never));
    expect(renderPage()).toContain('role="alert"');
    expect(renderPage()).toContain('Try again');

    vi.mocked(useQuery).mockImplementation(({ queryKey }) => ({
      data: queryKey[0] === 'commerce-orders' ? [] : undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never));
    expect(renderPage()).toContain('No orders yet');
  });
});
