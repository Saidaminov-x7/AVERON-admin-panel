import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrdersPage from './OrdersPage';
import { filterCommerceOrders } from './orderFilters';
import { getNextOrderTransition } from './orderTransitions';
import OrderTrackingDetails from './OrderTrackingDetails';
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
  statusHistory: [{
    status: 'CREATED',
    note: 'Customer requested careful packaging',
    createdAt: '2026-10-01T10:00:00.000Z',
  }],
  shipments: [{
    provider: 'Internal cargo',
    trackingNumber: 'TRK-12345',
    status: 'IN_TRANSIT',
    sentAt: '2026-10-01T12:00:00.000Z',
    arrivedAt: null,
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

  it('filters loaded orders by number, customer phone, and the selected server status', () => {
    const confirmedOrder = { ...order, orderNumber: 'AV-20261002-XYZ789', status: 'CONFIRMED' as const };
    const orders = [order, confirmedOrder];

    expect(filterCommerceOrders(orders, 'abc123', '')).toEqual([order]);
    expect(filterCommerceOrders(orders, '+998901234567', '')).toEqual([order, confirmedOrder]);
    expect(filterCommerceOrders(orders, '', 'CONFIRMED')).toEqual([confirmedOrder]);
    expect(filterCommerceOrders(orders, 'missing', '')).toEqual([]);
  });

  it('offers only the next server-approved sequential transition', () => {
    expect(getNextOrderTransition('CREATED')).toBe('CONFIRMED');
    expect(getNextOrderTransition('CONFIRMED')).toBe('PAID');
    expect(getNextOrderTransition('PAID')).toBe('ORDERED_FROM_SUPPLIER');
    expect(getNextOrderTransition('ORDERED_FROM_SUPPLIER')).toBe('SUPPLIER_CONFIRMED');
    expect(getNextOrderTransition('SUPPLIER_CONFIRMED')).toBe('IN_TRANSIT_CHINA');
    expect(getNextOrderTransition('IN_TRANSIT_CHINA')).toBe('CARGO_WAREHOUSE');
    expect(getNextOrderTransition('CARGO_WAREHOUSE')).toBe('INTERNATIONAL_TRANSIT');
    expect(getNextOrderTransition('INTERNATIONAL_TRANSIT')).toBe('ARRIVED_UZBEKISTAN');
    expect(getNextOrderTransition('ARRIVED_UZBEKISTAN')).toBe('OUT_FOR_DELIVERY');
    expect(getNextOrderTransition('OUT_FOR_DELIVERY')).toBe('DELIVERED');
    expect(getNextOrderTransition('DELIVERED')).toBe('COMPLETED');
    expect(getNextOrderTransition('CANCELLED')).toBeNull();
    expect(getNextOrderTransition('COMPLETED')).toBeNull();
    expect(getNextOrderTransition('REFUNDED')).toBeNull();
  });

  it('renders read-only shipment details and recent status notes', () => {
    const markup = renderToStaticMarkup(createElement(OrderTrackingDetails, {
      history: order.statusHistory,
      shipments: order.shipments,
      locale: 'en',
      statusLabels: { CREATED: { ru: 'Создан', uz: 'Yaratildi', en: 'Created' } },
      copy: {
        history: 'Status history',
        shipments: 'Shipments',
        provider: 'Provider',
        tracking: 'Tracking number',
        shipmentStatus: 'Shipment status',
        sentAt: 'Sent',
        arrivedAt: 'Arrived',
        noShipments: 'No shipments',
        noHistory: 'No history',
      },
    }));

    expect(markup).toContain('TRK-12345');
    expect(markup).toContain('Internal cargo');
    expect(markup).toContain('IN_TRANSIT');
    expect(markup).toContain('Customer requested careful packaging');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<textarea');
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
