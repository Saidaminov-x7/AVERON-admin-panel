// src/pages/commerce/FinancePage.tsx
// Реальная финансовая картина AVERON

import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import Layout from '../../components/Layout';
import { getCommerceDashboard } from '../../lib/commerceApi';

const fmt = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} сум`;

export default function FinancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['commerce-dashboard'],
    queryFn: getCommerceDashboard,
    refetchInterval: 60_000,
  });

  const cards = [
    {
      label: 'Выручка',
      value: fmt(data?.finance.revenue),
      Icon: CircleDollarSign,
      color: 'text-emerald-500',
      border: '',
    },
    {
      label: 'Все расходы',
      value: fmt(data?.finance.expenses),
      Icon: TrendingDown,
      color: 'text-red-500',
      border: '',
    },
    {
      label: 'Чистая прибыль',
      value: fmt(data?.finance.netProfit),
      Icon: TrendingUp,
      color: 'text-amber-500',
      border: 'border-amber-300 dark:border-amber-900/50',
    },
  ];

  return (
    <Layout title="Финансы">
      <div className="space-y-6">
        {/* Заголовок */}
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-500">ACTUAL ECONOMICS</p>
          <h1 className="text-2xl font-black text-app">Реальная прибыль</h1>
        </div>

        {/* Карточки */}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(({ label, value, Icon, color, border }) => (
            <div key={label} className={`card ${border}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{label}</p>
                <Icon size={20} className={color} />
              </div>
              <strong className="mt-3 block text-2xl text-app">
                {isLoading ? '—' : value}
              </strong>
            </div>
          ))}
        </div>

        {/* Формула */}
        <div className="card">
          <h2 className="font-bold text-app">Формула AVERON</h2>
          <p className="mt-2 text-sm text-muted">
            Выручка − закупка − cargo − комиссия − доставка − прочие расходы − возвраты.
          </p>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-mono">
            Прибыль = Выручка − (Закупка + Cargo + Комиссии + Доставка + Возвраты)
          </div>
        </div>
      </div>
    </Layout>
  );
}
