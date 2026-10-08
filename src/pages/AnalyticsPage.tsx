// src/pages/AnalyticsPage.tsx
// Страница расширенной аналитики с поддержкой произвольного диапазона дат

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Layout from '../components/Layout';
import { downloadAnalyticsReportApi, getRangeAnalyticsApi, getFunnelAnalyticsApi, getCustomerJourneyAnalyticsApi } from '../lib/analyticsApi';

const AnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [periodDays, setPeriodDays] = useState(30);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

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

  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'analytics', 'range', queryParams],
    queryFn: () => getRangeAnalyticsApi(queryParams),
  });

  const { data: funnel, isError: isFunnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ['admin', 'analytics', 'funnel', queryParams],
    queryFn: () => getFunnelAnalyticsApi(queryParams),
  });
  const { data: journey, isError: isJourneyError, refetch: refetchJourney } = useQuery({
    queryKey: ['admin', 'analytics', 'journey', queryParams],
    queryFn: () => getCustomerJourneyAnalyticsApi(queryParams),
  });

  const chartData = analytics?.chartData || [];
  const summary = analytics?.summary;
  const formatMetric = (value: number | undefined) => {
    if (isLoading) return '...';
    return typeof value !== 'number' || !Number.isFinite(value)
      ? t('analyticsPage.noData')
      : value.toLocaleString(dateLocale);
  };

  const dateLocale = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU';
  const formatRate = (value: number | undefined) =>
    typeof value !== 'number' || !Number.isFinite(value)
      ? t('analyticsPage.noData')
      : `${(value * 100).toFixed(1)}%`;

  const exportReport = async () => {
    setIsExporting(true);
    setExportError(false);
    try {
      const blob = await downloadAnalyticsReportApi({
        from: isCustom ? dateFrom : undefined,
        to: isCustom ? dateTo : undefined,
        type: 'traffic',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traffic-report-${isCustom ? `${dateFrom}-${dateTo}` : `${periodDays}-days`}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

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

          <button
            type="button"
            onClick={() => void exportReport()}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-app text-app hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExporting ? t('analyticsPage.exporting') : t('analyticsPage.exportCsv')}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-600">{t('analyticsPage.exportError')}</p>}
        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            <span>{t('analyticsPage.loadError')}</span>
            <button type="button" className="underline" onClick={() => void refetch()}>{t('analyticsPage.retry')}</button>
          </div>
        )}
        {isJourneyError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
            <span>{t('analyticsPage.journeyLoadError')}</span>
            <button type="button" className="underline" onClick={() => void refetchJourney()}>{t('analyticsPage.retry')}</button>
          </div>
        )}

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
              {isLoading ? '...' : formatMetric(summary?.revenueUzs) === t('analyticsPage.noData')
                ? t('analyticsPage.noData')
                : `${formatMetric(summary?.revenueUzs)} UZS`}
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

        <section className="space-y-4" aria-labelledby="customer-journey-heading">
          <div className="flex flex-col gap-1">
            <h2 id="customer-journey-heading" className="text-lg font-semibold text-app">{t('analyticsPage.journeyTitle')}</h2>
            <p className="text-sm text-muted">{t('analyticsPage.journeyDescription')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {[
              [t('analyticsPage.journeyVisitors'), journey?.firstTimeVisitors],
              [t('analyticsPage.journeyBuyers'), journey?.buyers],
              [t('analyticsPage.journeyConversion'), journey ? formatRate(journey.conversionRate) : undefined],
              [t('analyticsPage.journeyAvgDays'), journey?.avgDaysToFirstPurchase.toFixed(1)],
              [t('analyticsPage.journeyAvgProducts'), journey?.avgProductsInFirstOrder.toFixed(1)],
            ].map(([label, value]) => (
              <div key={String(label)} className="card min-w-0 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-2 text-xl font-semibold text-app">{value === undefined ? (isLoading ? '...' : t('analyticsPage.noData')) : value}</p>
              </div>
            ))}
          </div>
          <div className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h3 className="font-semibold text-app">{t('analyticsPage.journeyDay3')}</h3>
              <p className="mt-1 text-sm text-muted">{t('analyticsPage.journeyDay3Note', { buyers: journey?.day3Buyers ?? 0, visitors: journey?.matureVisitors ?? 0 })}</p>
            </div>
            <p className="text-3xl font-semibold text-app">{journey ? formatRate(journey.day3ConversionRate) : (isLoading ? '...' : t('analyticsPage.noData'))}</p>
          </div>
          <div className="card p-4 sm:p-5">
            <h3 className="mb-4 text-sm font-semibold text-app">{t('analyticsPage.journeyChartTitle')}</h3>
            {!journey?.daily.length ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted">{isLoading ? '...' : t('analyticsPage.noData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={journey.daily} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="purchases" name={t('analyticsPage.journeyPurchases')} stroke="#161616" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="units" name={t('analyticsPage.journeyUnits')} stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

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
        {isFunnelError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            <span>{t('analyticsPage.funnelError')}</span>
            <button type="button" className="underline" onClick={() => void refetchFunnel()}>{t('analyticsPage.retry')}</button>
          </div>
        ) : funnel && (
          <div className="card">
            <h3 className="text-base font-semibold text-app mb-4">{t('analyticsPage.engagementTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <div className="text-xs font-semibold text-primary-600 dark:text-primary-400">{t('analyticsPage.funnelViews')}</div>
                <div className="text-2xl font-bold text-app mt-1">{formatMetric(funnel.visits)}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelVisits')}</div>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">{t('analyticsPage.funnelFavorites')}</div>
                <div className="text-2xl font-bold text-app mt-1">{formatMetric(funnel.favorites)}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelConversion', { rate: formatRate(funnel.favoriteRate) })}</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('analyticsPage.funnelOrders')}</div>
                <div className="text-2xl font-bold text-app mt-1">{formatMetric(funnel.paidOrders)}</div>
                <div className="text-[11px] text-muted mt-1">{t('analyticsPage.funnelConversion', { rate: formatRate(funnel.orderRate) })}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
