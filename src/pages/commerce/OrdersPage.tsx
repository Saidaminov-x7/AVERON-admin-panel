// src/pages/commerce/OrdersPage.tsx
// Страница заказов клиентов

import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import Layout from '../../components/Layout';
import { getOrders } from '../../lib/commerceApi';
import { EmptyState } from '../../components/ui';

const ORDER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Ожидает',    cls: 'badge-warning' },
  PAID:       { label: 'Оплачен',    cls: 'badge-info' },
  SHIPPED:    { label: 'Отправлен',  cls: 'badge-info' },
  DELIVERED:  { label: 'Доставлен', cls: 'badge-success' },
  CANCELLED:  { label: 'Отменён',   cls: 'badge-danger' },
  REFUNDED:   { label: 'Возврат',   cls: 'badge-neutral' },
};

export default function OrdersPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['commerce-orders'],
    queryFn: getOrders,
  });

  return (
    <Layout title="Заказы">
      <div className="space-y-6">
        {/* Заголовок */}
        <div>
          <p className="text-xs font-bold tracking-widest text-primary-500">COMMERCE</p>
          <h1 className="text-2xl font-black text-app">Заказы клиентов</h1>
        </div>

        {isLoading ? (
          <div className="card animate-pulse h-48" />
        ) : (data as any[]).length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={32} />}
            title="Заказов пока нет"
            description="Когда клиенты оформят заказы, они появятся здесь"
          />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-left text-xs text-muted font-semibold tracking-wide uppercase">
                  <th className="px-4 py-3">Номер</th>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3 text-right">Прибыль</th>
                  <th className="px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {(data as any[]).map((o) => {
                  const statusInfo = ORDER_STATUS_MAP[o.status] ?? { label: o.status, cls: 'badge-neutral' };
                  return (
                    <tr key={o.id} className="border-t border-app hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-bold text-app">#{o.orderNumber}</td>
                      <td className="px-4 py-3 text-muted">{o.userName || o.userEmail || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={statusInfo.cls}>{statusInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-app">
                        {Number(o.totalRevenue).toLocaleString('ru-RU')} сум
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {Number(o.netProfit).toLocaleString('ru-RU')} сум
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
