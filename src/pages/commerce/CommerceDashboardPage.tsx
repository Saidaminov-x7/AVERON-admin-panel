// src/pages/commerce/CommerceDashboardPage.tsx
// Главный дашборд коммерческой части AVERON

import { useQuery } from '@tanstack/react-query';
import {
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { getCommerceDashboard } from '../../lib/commerceApi';

const money = (value: string | number | undefined) =>
  `${Number(value || 0).toLocaleString('ru-RU')} сум`;

export default function CommerceDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commerce-dashboard'],
    queryFn: getCommerceDashboard,
    refetchInterval: 30_000,
  });

  const cards = [
    { label: 'Выручка',           value: money(data?.finance.revenue),     Icon: CircleDollarSign, color: 'text-emerald-500' },
    { label: 'Чистая прибыль',    value: money(data?.finance.netProfit),   Icon: TrendingUp,       color: 'text-amber-500' },
    { label: 'Заказы',            value: data?.orders.total ?? 0,          Icon: PackageCheck,     color: 'text-blue-500' },
    { label: 'Ожидают проверки',  value: data?.products.pendingReview ?? 0, Icon: ClipboardCheck,  color: 'text-orange-500' },
    { label: 'Опубликовано',      value: data?.products.published ?? 0,    Icon: ShoppingBag,      color: 'text-violet-500' },
    { label: 'Пользователи',      value: data?.users.total ?? 0,           Icon: Users,            color: 'text-cyan-500' },
  ] as const;

  return (
    <Layout title="AVERON Command Center">
      {/* Hero-баннер */}
      <section className="overflow-hidden rounded-3xl bg-surface border border-app p-7 text-app shadow-sm">
        <p className="text-xs font-bold tracking-[.2em] text-amber-500">КИТАЙ → УЗБЕКИСТАН</p>
        <h1 className="mt-3 text-3xl font-black text-app">Товары, доставка и реальная прибыль</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          AI готовит карточки. Решение о публикации всегда принимает администратор.
        </p>
      </section>

      {/* Ошибка подключения */}
      {isError && (
        <div className="card border-red-300 text-red-600 dark:border-red-900/50 dark:text-red-400">
          Backend AVERON недоступен. Проверьте соединение.
        </div>
      )}

      {/* Метрики */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, Icon, color }) => (
          <div className="card" key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">{label}</span>
              <Icon className={color} size={22} />
            </div>
            <div className="mt-4 text-2xl font-black text-app">
              {isLoading ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Информационные карточки */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-app">Контроль публикации</h2>
          <p className="mt-2 text-sm text-muted">
            Ни один импортированный товар не появляется на сайте без Approve.
          </p>
        </div>
        <div className="card">
          <h2 className="font-bold text-app">Фактическая экономика</h2>
          <p className="mt-2 text-sm text-muted">
            Прибыль учитывает закупку, cargo, комиссии, доставку и возвраты.
          </p>
        </div>
      </div>
    </Layout>
  );
}
