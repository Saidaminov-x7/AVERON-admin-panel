import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Layout from '../../components/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getVisitorsStatsApi } from '../../lib/analyticsApi';
import { validateAnalyticsDateRange } from '../../lib/analyticsDateRange';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
  return dateString(new Date(Date.now() - days * DAY_MS));
}

const TrafficAnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<number | null>(DEFAULT_DAYS);
  const [dateFrom, setDateFrom] = useState(() => dateDaysAgo(DEFAULT_DAYS - 1));
  const [dateTo, setDateTo] = useState(() => dateString(new Date()));
  const isCustom = days === null;
  const rangeError = isCustom ? validateAnalyticsDateRange(dateFrom, dateTo) : null;
  const dateLocale = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU';
  const formatMetric = (value: number) => new Intl.NumberFormat(dateLocale, { maximumFractionDigits: 0 }).format(value);
  const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
    new Date(`${value}T00:00:00.000Z`).toLocaleDateString(dateLocale, { ...options, timeZone: 'UTC' });
  const queryParams = isCustom ? { from: dateFrom, to: dateTo } : { days: days ?? DEFAULT_DAYS };

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'analytics', 'visitors', queryParams],
    queryFn: () => getVisitorsStatsApi(queryParams),
    enabled: !rangeError,
  });

  const daily = stats?.daily ?? [];
  const total = stats?.totalVisitors ?? 0;
  const isEmpty = !isLoading && !isError && daily.length === 0;
  const periods = [7, 14, 30, 60, 90];

  const getRangeErrorText = () => {
    if (rangeError === 'required') return t('trafficPage.validation.required');
    if (rangeError === 'invalid') return t('trafficPage.validation.invalid');
    if (rangeError === 'startAfterEnd') return t('trafficPage.validation.startAfterEnd');
    if (rangeError === 'tooLong') return t('trafficPage.validation.tooLong');
    return '';
  };

  return (
    <Layout title={t('trafficPage.title')}>
      <div className="analytics-page space-y-6 max-w-7xl mx-auto">
        <div className="analytics-surface card flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('trafficPage.periodLabel')}>
            {periods.map((period) => (
              <Button
                key={period}
                type="button"
                size="md"
                variant={days === period ? 'primary' : 'outline'}
                aria-pressed={days === period}
                onClick={() => setDays(period)}
              >
                {t('trafficPage.periodDays', { count: period })}
              </Button>
            ))}
            <Button
              type="button"
              size="md"
              variant={isCustom ? 'primary' : 'outline'}
              aria-pressed={isCustom}
              onClick={() => setDays(null)}
            >
              {t('trafficPage.periodCustom')}
            </Button>
          </div>

          {isCustom && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_auto_minmax(0,220px)] sm:items-end">
              <Input type="date" label={t('trafficPage.dateFrom')} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-invalid={Boolean(rangeError)} />
              <span className="hidden pb-3 text-muted sm:block" aria-hidden="true">—</span>
              <Input type="date" label={t('trafficPage.dateTo')} value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-invalid={Boolean(rangeError)} />
            </div>
          )}

          {rangeError ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{getRangeErrorText()}</p> : null}
          <p className="text-xs text-muted">{t('trafficPage.aggregationNote')}</p>
        </div>

        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            <span>{t('trafficPage.loadError')}</span>
            <Button type="button" variant="outline" size="md" onClick={() => void refetch()}>{t('trafficPage.retry')}</Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_2fr]">
          <section className="analytics-surface card flex flex-col justify-between gap-3" aria-labelledby="traffic-total-heading" aria-busy={isLoading}>
            <div>
              <h2 id="traffic-total-heading" className="text-xs font-semibold uppercase tracking-wider text-muted">{t('trafficPage.totalVisitors')}</h2>
              <p className="mt-2 text-3xl font-bold tabular-nums text-app">{isLoading ? '…' : formatMetric(total)}</p>
            </div>
            <p className="text-xs text-muted">{isLoading ? t('trafficPage.loading') : t('trafficPage.totalNote')}</p>
          </section>

          <section className="analytics-surface card min-w-0" aria-labelledby="traffic-chart-heading" aria-busy={isLoading}>
            <h2 id="traffic-chart-heading" className="mb-4 text-base font-semibold text-app">{t('trafficPage.chartTitle')}</h2>
            {isLoading ? (
              <div className="analytics-surface-muted h-72 animate-pulse" aria-label={t('trafficPage.loading')} />
            ) : isError || rangeError || isEmpty ? (
              <div className="analytics-surface-muted flex h-72 items-center justify-center px-4 text-center text-sm text-muted">
                {rangeError ? getRangeErrorText() : isEmpty ? t('trafficPage.noData') : t('trafficPage.loadError')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(value) => formatDate(String(value))} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value), { day: 'numeric', month: 'long', year: 'numeric' })}
                    formatter={(value) => [formatMetric(Number(value)), t('trafficPage.uniqueVisitors')]}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 0, fontSize: '12px', color: 'var(--color-text)' }}
                  />
                  <Area type="monotone" dataKey="visitors" name={t('trafficPage.uniqueVisitors')} stroke="var(--color-info)" strokeWidth={2.5} fillOpacity={1} fill="url(#visitorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        <section className="analytics-surface card overflow-hidden p-0" aria-labelledby="traffic-table-heading" aria-busy={isLoading}>
          <h2 id="traffic-table-heading" className="border-b border-app px-4 py-4 text-sm font-bold text-app sm:px-6">{t('trafficPage.tableTitle')}</h2>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="analytics-surface-muted sticky top-0 border-b border-app text-xs font-semibold uppercase text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">{t('trafficPage.dateColumn')}</th>
                  <th scope="col" className="px-4 py-3 sm:px-6">{t('trafficPage.visitorsColumn')}</th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">{t('trafficPage.shareColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {isLoading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted sm:px-6">{t('trafficPage.loading')}</td></tr>
                ) : isError || rangeError || isEmpty ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted sm:px-6">{rangeError ? getRangeErrorText() : isEmpty ? t('trafficPage.noData') : t('trafficPage.loadError')}</td></tr>
                ) : (
                  [...daily].reverse().map((item) => {
                    const share = total > 0 ? (item.visitors / total) * 100 : 0;
                    return (
                      <tr key={item.date}>
                        <td className="px-4 py-3 font-medium text-app sm:px-6">{formatDate(item.date, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' })}</td>
                        <td className="px-4 py-3 font-bold tabular-nums text-primary-600 dark:text-primary-300 sm:px-6">{formatMetric(item.visitors)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted sm:px-6">{new Intl.NumberFormat(dateLocale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(share)}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default TrafficAnalyticsPage;
