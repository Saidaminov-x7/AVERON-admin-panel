import type { CommerceOrderStatus, CommerceOrderTransition } from '../../lib/commerceApi';

const nextOrderTransition: Partial<Record<CommerceOrderStatus, CommerceOrderTransition>> = {
  CREATED: 'CONFIRMED',
  CONFIRMED: 'PAID',
  PAID: 'ORDERED_FROM_SUPPLIER',
  ORDERED_FROM_SUPPLIER: 'SUPPLIER_CONFIRMED',
  SUPPLIER_CONFIRMED: 'IN_TRANSIT_CHINA',
  IN_TRANSIT_CHINA: 'CARGO_WAREHOUSE',
  CARGO_WAREHOUSE: 'INTERNATIONAL_TRANSIT',
  INTERNATIONAL_TRANSIT: 'ARRIVED_UZBEKISTAN',
  ARRIVED_UZBEKISTAN: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
  DELIVERED: 'COMPLETED',
};

export function getNextOrderTransition(status: CommerceOrderStatus): CommerceOrderTransition | null {
  return nextOrderTransition[status] ?? null;
}
