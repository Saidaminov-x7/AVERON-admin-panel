import type { CommerceOrder } from '../../lib/commerceApi';

function readField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object' || !(key in value)) return '';
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : '';
}

export function filterCommerceOrders(orders: CommerceOrder[], search: string, statusFilter: string) {
  const searchTerm = search.trim().toLocaleLowerCase();
  return orders.filter((order) => {
    const customerName = readField(order.contact, 'name');
    const matchesSearch = !searchTerm
      || order.orderNumber.toLocaleLowerCase().includes(searchTerm)
      || customerName.toLocaleLowerCase().includes(searchTerm)
      || readField(order.contact, 'phone').toLocaleLowerCase().includes(searchTerm);
    return matchesSearch && (!statusFilter || order.status === statusFilter);
  });
}
