import { describe, expect, it } from 'vitest';
import { getNextDeliveryTransitions } from './deliveryTransitions';

describe('internal delivery transitions', () => {
  it('returns only permitted next delivery states', () => {
    expect(getNextDeliveryTransitions('PENDING')).toEqual(['PREPARING', 'CANCELLED']);
    expect(getNextDeliveryTransitions('PREPARING')).toEqual(['SHIPPED', 'CANCELLED']);
    expect(getNextDeliveryTransitions('SHIPPED')).toEqual(['IN_TRANSIT']);
  });

  it('does not allow transitions from terminal statuses', () => {
    expect(getNextDeliveryTransitions('DELIVERED')).toEqual([]);
    expect(getNextDeliveryTransitions('CANCELLED')).toEqual([]);
  });
});
