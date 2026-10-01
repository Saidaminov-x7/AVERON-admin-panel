import type { CommerceDeliveryStatus } from '../../lib/commerceApi';

const nextDeliveryTransitions: Record<CommerceDeliveryStatus, readonly CommerceDeliveryStatus[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT'],
  IN_TRANSIT: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function getNextDeliveryTransitions(status: CommerceDeliveryStatus): readonly CommerceDeliveryStatus[] {
  return nextDeliveryTransitions[status];
}
