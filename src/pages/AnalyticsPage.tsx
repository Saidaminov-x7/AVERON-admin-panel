// src/pages/AnalyticsPage.tsx
// Страница расширенной аналитики с поддержкой произвольного диапазона дат

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Layout from '../components/Layout';
import { getRangeAnalyticsApi, getFunnelAnalyticsApi, exportReportUrl } from '../lib/analyticsApi';

const AnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [periodDays, setPeriodDays] = useState(30);

  const PERIODS = [
    { label: t('analyticsPage.period7'), value: 7 },
    { label: t('analyticsPage.period30'), value: 30 },
    { label: t('analyticsPage.period90'), value: 90 },
    { label: t('analyticsPage.periodCustom'), value: -1 },
  ];

  // Произвольные даты
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(monthAgoStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const isCustom = periodDays === -1;

  const queryParams = isCustom
    ? { from: dateFrom, to: dateTo }
    : { days: periodDays };

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'range', queryParams],
    queryFn: () => getRangeAnalyticsApi(queryParams),
  });

  const { data: funnel } = useQuery({
    queryKey: ['admin', 'analytics', 'funnel', queryParams],
    queryFn: () => getFunnelAnalyticsApi(queryParams),
  });

  const chartData = analytics?.chartData || [];
  const summary = analytics?.summary;
  const formatMetric = (value: number | undefined) => {
    if (isLoading) return '...';
    return value === undefined ? t('analyticsPage.noData') : value.toLocaleString();
  };

  const dateLocale = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU';

  return (
    <Layout title={t('analytics.title')}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Фильтры периода и экспорт */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodDays(p.value)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${periodDays === p.value
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'border border-app text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
              >
                {p.label}
              </button>
            ))}

            {isCustom && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input py-1 px-2.5 text-xs w-36"
                />
                <span className="text-xs text-muted">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input py-1 px-2.5 text-xs w-36"
                />
              </div>
            )}
          </div>

          <a
            href={exportReportUrl({
              from: isCustom ? dateFrom : undefined,
              to: isCustom ? dateTo : undefined,
              type: 'traffic',
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-app text-app hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('analyticsPage.exportCsv')}
          </a>
        </div>

        {/* Метрики за период */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t('analyticsPage.uniqueVisitors')}
            </div>
            <div className="text-2xl font-extrabold text-app">
              {formatMetric(summary?.totalVisitors)}
            </div>
            <p className="text-[11px] text-muted mt-1">{t('analyticsPage.dedupeNote')}</p>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t('analyticsPage.paidOrders')}
            </div>
            <div className="text-2xl font-extrabold text-app">
              {formatMetric(summary?.totalPaidOrders)}
            </div>
            <p className="text-[11px] text-muted mt-1">{t('analyticsPage.paidOrdersNote')}</p>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t('analyticsPage.netRevenue')}
            </div>
            <div className="text-2xl font-extrabold text-app">
              {isLoading
                ? '...'
                : summary === undefined
                  ? t('analyticsPage.noData')
                  : `${summary.revenueUzs.toLocaleString(dateLocale)} UZS`}
            </div>
            <p className="text-[11px] text-muted mt-1">{t('analyticsPage.netRevenueNote')}</p>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t('analyticsPage.newProducts')}
            </div>
            <div className="text-2xl font-extrabold text-app">
              {formatMetric(summary?.totalProducts)}
            </div>
            <p className="text-[11px] text-muted mt-1">{t('analyticsPage.addedNote')}</p>
          </div>
        </div>

        {/* График динамики */}
        <div className="card">
          <h3 className="text-base font-semibold text-app mb-4">{t('analyticsPage.chartTitle')}</h3>
          {isLoading ? (
            <div className="h-72 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted text-sm">
              {t('analyticsPage.noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
                  }
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 6))}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'var(--color-text)',
                  }}
                  labelFormatter={(v) =>
                    new Date(String(v)).toLocaleDateString(dateLocale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  }
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  name={t('analyticsPage.lineVisitors')}
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  name={t('analyticsPage.lineRegistrations')}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="products"
                  name={t('analyticsPage.lineProducts')}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="paidOrders"
                  name={t('analyticsPage.linePaidOrders')}
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Воронка конверсии */}
        {funnel && (
          <div className="card">
            <h3 className="text-base font-semibold text-app mb-4">{t('analyticsPage.engagementTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <div className="text-xs font-semibold text-primary-600 dark:text-primary-400">{t('analyticsPage.funnelViews')}</div>
                <div className="text-2xl font-bold text-app mt-1">{funnel.visits}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelVisits')}</div>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">{t('analyticsPage.funnelFavorites')}</div>
                <div className="text-2xl font-bold text-app mt-1">{funnel.favorites}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelConversion', { rate: (funnel.favoriteRate * 100).toFixed(1) })}</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('analyticsPage.funnelOrders')}</div>
                <div className="text-2xl font-bold text-app mt-1">{funnel.paidOrders}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelConversion', { rate: (funnel.orderRate * 100).toFixed(1) })}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;