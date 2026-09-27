// src/pages/monetization/RevenueAnalyticsPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getRevenueStatsApi } from '../../lib/extendedAdminApi';
import { DollarSign, TrendingUp, Zap, Crown, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const RevenueAnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'revenue-stats'],
    queryFn: getRevenueStatsApi,
  });

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('monetization.revenueTitle', 'Финансовая аналитика и выручка')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Баннер статуса онлайн-оплаты */}
        {!data?.hasPaymentIntegration && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold">{t('monetization.paymentNotice', 'Онлайн-оплата (Payme / Click) находится в разработке')}</div>
              <div className="text-xs text-amber-800/80 dark:text-amber-400 mt-0.5">
                Показанные ниже метрики разделяют подтверждённую выручку по транзакциям от расчётной потенциальной стоимости текущих активных Boost-объявлений.
              </div>
            </div>
          </div>
        )}

        {/* KPI карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">{t('monetization.actualRevenue', 'Подтверждённая выручка')}</span>
              <DollarSign size={18} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {(data?.actualRevenue ?? 0).toLocaleString()} сум
            </div>
            <div className="text-xs text-muted mt-1">
              За 30 дней: {(data?.last30DaysRevenue ?? 0).toLocaleString()} сум
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">{t('monetization.potentialRevenue', 'Потенциальная стоимость промо')}</span>
              <TrendingUp size={18} className="text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-app">
              {(data?.potentialValueOfActivePromotions ?? 0).toLocaleString()} сум
            </div>
            <div className="text-xs text-muted mt-1">Оценка номинальной стоимости активных тарифов</div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">{t('monetization.activePromotions', 'Активных продвижений')}</span>
              <Zap size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-app">
              {data?.activePromotionsCount ?? 0} шт.
            </div>
            <div className="text-xs text-muted mt-1">Объявления с активным бустом прямо сейчас</div>
          </div>
        </div>

        {/* Распределение по тарифам */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Тариф BASIC (50 000 сум)</div>
              <div className="text-lg font-bold text-app">{data?.tierCounts?.BASIC ?? 0} шт.</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Crown size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Тариф TOP (120 000 сум)</div>
              <div className="text-lg font-bold text-app">{data?.tierCounts?.TOP ?? 0} шт.</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Тариф URGENT (90 000 сум)</div>
              <div className="text-lg font-bold text-app">{data?.tierCounts?.URGENT ?? 0} шт.</div>
            </div>
          </div>
        </div>

        {/* Таблица продвигаемых объявлений */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-app">
            <h3 className="font-bold text-app text-sm">Объявления с активным продвижением</h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted">{t('common.loading', 'Загрузка данных...')}</div>
          ) : !data?.promotedListings || data.promotedListings.length === 0 ? (
            <div className="p-8 text-center text-muted">Активных платных продвижений пока нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3">{t('nav.listings', 'Объявление')}</th>
                    <th className="p-3">Тариф</th>
                    <th className="p-3">Действует до</th>
                    <th className="p-3">{t('common.date', 'Дата подключения')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {data.promotedListings.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-semibold text-app">{p.title}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                          {p.promotionTier}
                        </span>
                      </td>
                      <td className="p-3 text-muted font-mono text-xs">
                        {p.promotedUntil
                          ? format(new Date(p.promotedUntil), 'd MMM yyyy, HH:mm', { locale: currentLocale })
                          : 'Бессрочно'}
                      </td>
                      <td className="p-3 text-xs text-muted">
                        {format(new Date(p.createdAt), 'd MMM yyyy', { locale: currentLocale })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RevenueAnalyticsPage;
