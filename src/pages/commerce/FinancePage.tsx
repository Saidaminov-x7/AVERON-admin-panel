// src/pages/commerce/FinancePage.tsx
// Реальная финансовая картина AVERON

import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getCommerceDashboard } from '../../lib/commerceApi';

export default function FinancePage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['commerce-dashboard'],
    queryFn: getCommerceDashboard,
    refetchInterval: 60_000,
  });

  const currencyLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ru-RU';
  const fmt = (v: unknown) => `${Number(v || 0).toLocaleString(currencyLocale)} ${t('finance.currencySuffix', 'сум')}`;

  const cards = [
    {
      label: t('finance.revenue', 'Выручка'),
      value: fmt(data?.finance.revenue),
      Icon: CircleDollarSign,
      color: 'text-emerald-500',
      border: '',
    },
    {
      label: t('finance.expenses', 'Все расходы'),
      value: fmt(data?.finance.expenses),
      Icon: TrendingDown,
      color: 'text-red-500',
      border: '',
    },
    {
      label: t('finance.netProfit', 'Чистая прибыль'),
      value: fmt(data?.finance.netProfit),
      Icon: TrendingUp,
      color: 'text-amber-500',
      border: 'border-amber-300 dark:border-amber-900/50',
    },
  ];

  return (
    <Layout title={t('finance.title', 'Финансы')}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-500">{t('finance.section', 'ACTUAL ECONOMICS')}</p>
          <h1 className="text-2xl font-black text-app">{t('finance.heroTitle', 'Реальная прибыль')}</h1>
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
      </div>
    </Layout>
  );
}
