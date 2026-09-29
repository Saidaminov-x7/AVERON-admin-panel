// src/pages/commerce/OrdersPage.tsx
// Страница заказов клиентов

import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getOrders } from '../../lib/commerceApi';
import { EmptyState } from '../../components/ui';

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { data = [], isLoading } = useQuery({
    queryKey: ['commerce-orders'],
    queryFn: getOrders,
  });

  const ORDER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
    PENDING:    { label: t('orders.statusPending', 'Ожидает'),    cls: 'badge-warning' },
    PAID:       { label: t('orders.statusPaid', 'Оплачен'),       cls: 'badge-info' },
    SHIPPED:    { label: t('orders.statusShipped', 'Отправлен'),  cls: 'badge-info' },
    DELIVERED:  { label: t('orders.statusDelivered', 'Доставлен'),cls: 'badge-success' },
    CANCELLED:  { label: t('orders.statusCancelled', 'Отменён'),  cls: 'badge-danger' },
    REFUNDED:   { label: t('orders.statusRefunded', 'Возврат'),   cls: 'badge-neutral' },
  };

  const currencyLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ru-RU';

  return (
    <Layout title={t('orders.title', 'Заказы клиентов')}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div>
          <p className="text-xs font-bold tracking-widest text-primary-500">{t('orders.section', 'COMMERCE')}</p>
          <h1 className="text-2xl font-black text-app">{t('orders.title', 'Заказы клиентов')}</h1>
        </div>

        {isLoading ? (
          <div className="card animate-pulse h-48" />
        ) : (data as any[]).length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={32} />}
            title={t('orders.emptyTitle', 'Заказов пока нет')}
            description={t('orders.emptyDesc', 'Когда клиенты оформят заказы, они появятся здесь')}
          />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-left text-xs text-muted font-semibold tracking-wide uppercase">
                  <th className="px-4 py-3">{t('orders.tableNumber', 'Номер')}</th>
                  <th className="px-4 py-3">{t('orders.tableCustomer', 'Клиент')}</th>
                  <th className="px-4 py-3">{t('orders.tableStatus', 'Статус')}</th>
                  <th className="px-4 py-3 text-right">{t('orders.tableAmount', 'Сумма')}</th>
                  <th className="px-4 py-3 text-right">{t('orders.tableProfit', 'Прибыль')}</th>
                  <th className="px-4 py-3">{t('orders.tableDate', 'Дата')}</th>
                </tr>
              </thead>
              <tbody>
                {(data as any[]).map((o) => {
                  const statusInfo = ORDER_STATUS_MAP[o.status] ?? { label: o.status, cls: 'badge-neutral' };
                  return (
                    <tr key={o.id} className="border-t border-app hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-bold text-app">#{o.orderNumber}</td>
                      <td className="px-4 py-3 text-app">{o.contact?.name || o.user?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={statusInfo.cls}>{statusInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-app">
                        {Number(o.totalRevenue || 0).toLocaleString(currencyLocale)} {t('commerce.currencySuffix', 'сум')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {Number(o.netProfit || 0).toLocaleString(currencyLocale)} {t('commerce.currencySuffix', 'сум')}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {new Date(o.createdAt).toLocaleDateString(currencyLocale)}
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
