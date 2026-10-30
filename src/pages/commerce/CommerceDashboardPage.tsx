// src/pages/commerce/CommerceDashboardPage.tsx
// Главный дашборд коммерческой части AVERON

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { Button } from '../../components/ui';
import { getCommerceDashboard } from '../../lib/commerceApi';

export default function CommerceDashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['commerce-dashboard'],
    queryFn: getCommerceDashboard,
    refetchInterval: 30_000,
  });

  const numberLocale = i18n.language?.startsWith('en')
    ? 'en-US'
    : i18n.language?.startsWith('uz')
      ? 'uz-UZ'
      : 'ru-RU';
  const money = (value: string | number | undefined) =>
    `${Number(value).toLocaleString(numberLocale)} ${t('commerce.currencySuffix', 'сум')}`;

  const cards = data ? [
    { label: t('commerce.revenue', 'Выручка'),                 value: money(data.finance.revenue),       Icon: CircleDollarSign, color: 'text-emerald-500' },
    { label: t('commerce.netProfit', 'Чистая прибыль'),         value: money(data.finance.netProfit),     Icon: TrendingUp,       color: 'text-amber-500' },
    { label: t('commerce.orders', 'Заказы'),                   value: data.orders.total,                 Icon: PackageCheck,     color: 'text-blue-500' },
    { label: t('commerce.pendingReview', 'Ожидают проверки'), value: data.products.pendingReview,      Icon: ClipboardCheck,  color: 'text-orange-500' },
    { label: t('commerce.published', 'Опубликовано'),         value: data.products.published,           Icon: ShoppingBag,      color: 'text-primary-500' },
    { label: t('commerce.users', 'Пользователи'),             value: data.users.total,                  Icon: Users,            color: 'text-cyan-500' },
  ] : [];

  return (
    <Layout title={t('commerce.commandCenter', 'AVERON Command Center')}>
      {/* Hero-баннер */}
      <section className="overflow-hidden rounded-3xl bg-surface border border-app p-7 text-app shadow-sm">
        <p className="text-xs font-bold tracking-[.2em] text-amber-500">{t('commerce.route', 'КИТАЙ → УЗБЕКИСТАН')}</p>
        <h1 className="mt-3 text-3xl font-black text-app">{t('commerce.heroTitle', 'Товары, доставка и реальная прибыль')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {t('commerce.heroSubtitle', 'AI готовит карточки. Решение о публикации всегда принимает администратор.')}
        </p>
      </section>

      {/* First load, failure without data, and real metrics have distinct states. */}
      {isLoading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite">
          <span className="sr-only">{t('commerce.dashboardLoading', 'Загрузка показателей дашборда')}</span>
          {Array.from({ length: 6 }, (_, index) => (
            <div className="card space-y-4" key={index} aria-hidden="true">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 animate-pulse motion-reduce:animate-none bg-surface-soft" />
                <div className="h-5 w-5 animate-pulse motion-reduce:animate-none bg-surface-soft" />
              </div>
              <div className="h-8 w-32 animate-pulse motion-reduce:animate-none bg-surface-soft" />
            </div>
          ))}
        </div>
      ) : isError && !data ? (
        <section className="card flex flex-col gap-3 border-red-200 bg-red-50 p-4 text-app dark:border-red-900/50 dark:bg-red-950/20 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6" role="alert">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-red-700 dark:text-red-300" size={20} aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold text-app">{t('commerce.dashboardUnavailableTitle', 'Не удалось загрузить показатели')}</h2>
              <p className="mt-1 text-sm text-muted">{t('commerce.dashboardUnavailableDescription', 'Показатели скрыты, пока сервер не вернёт актуальные данные.')}</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<RefreshCw size={16} aria-hidden="true" />}
            className="w-full shrink-0 rounded-none sm:w-auto"
            onClick={() => { void refetch(); }}
            disabled={isFetching}
            loading={isFetching}
            aria-busy={isFetching}
          >
            {t('commerce.retry', 'Повторить')}
          </Button>
        </section>
      ) : (
        <>
          {isError && data && (
            <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200" role="status" aria-live="polite">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm">{t('commerce.dashboardStaleWarning', 'Не удалось обновить данные. Ниже показаны последние успешно загруженные значения.')}</p>
            </div>
          )}
          {data && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(({ label, value, Icon, color }) => (
                <div className="card" key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted">{label}</span>
                    <Icon className={color} size={22} />
                  </div>
                  <div className="mt-4 text-2xl font-black text-app">{value}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Информационные карточки */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-app">{t('commerce.publicationControl', 'Контроль публикации')}</h2>
          <p className="mt-2 text-sm text-muted">
            {t('commerce.publicationControlDesc', 'Ни один импортированный товар не появляется на сайте без Approve.')}
          </p>
        </div>
        <div className="card">
          <h2 className="font-bold text-app">{t('commerce.actualEconomics', 'Фактическая экономика')}</h2>
          <p className="mt-2 text-sm text-muted">
            {t('commerce.actualEconomicsDesc', 'Прибыль учитывает закупку, cargo, комиссии, доставку и возвраты.')}
          </p>
        </div>
      </div>
    </Layout>
  );
}
