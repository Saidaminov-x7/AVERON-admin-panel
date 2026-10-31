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
import { Button, Card } from '../../components/ui';
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

  const cards = [
    { label: t('commerce.revenue', 'Выручка'),                     value: money(data?.finance.revenue),     Icon: CircleDollarSign, color: 'text-success' },
    { label: t('commerce.netProfit', 'Чистая прибыль'),             value: money(data?.finance.netProfit),   Icon: TrendingUp,       color: 'text-warning' },
    { label: t('commerce.orders', 'Заказы'),                       value: data?.orders.total ?? 0,          Icon: PackageCheck,     color: 'text-info' },
    { label: t('commerce.pendingReview', 'Ожидают проверки'),     value: data?.products.pendingReview ?? 0, Icon: ClipboardCheck,  color: 'text-warning' },
    { label: t('commerce.published', 'Опубликовано'),             value: data?.products.published ?? 0,    Icon: ShoppingBag,      color: 'text-primary-500' },
    { label: t('commerce.users', 'Пользователи'),                 value: data?.users.total ?? 0,           Icon: Users,            color: 'text-info' },
  ] as const;

  return (
    <Layout title={t('commerce.commandCenter', 'AVERON Command Center')}>
      {/* Hero-баннер */}
      <section className="overflow-hidden rounded-3xl bg-surface border border-app p-8 text-app shadow-sm">
        <p className="text-xs font-bold tracking-[.2em] text-warning">{t('commerce.route', 'КИТАЙ → УЗБЕКИСТАН')}</p>
        <h1 className="mt-3 text-3xl font-black text-app">{t('commerce.heroTitle', 'Товары, доставка и реальная прибыль')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {t('commerce.heroSubtitle', 'AI готовит карточки. Решение о публикации всегда принимает администратор.')}
        </p>
      </Card>

      {/* Ошибка подключения */}
      {isError && (
        <div className="card border-line text-error dark:border-line dark:text-error">
          {t('commerce.backendError', 'Backend AVERON недоступен. Проверьте соединение.')}
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

      <section aria-label={t('commerce.publicationControl', 'Контроль публикации')} className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
        <Card padding="md">
          <h2 className="text-base font-semibold leading-6 text-app">{t('commerce.publicationControl', 'Контроль публикации')}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t('commerce.publicationControlDesc', 'Ни один импортированный товар не появляется на сайте без Approve.')}
          </p>
        </Card>
        <Card padding="md">
          <h2 className="text-base font-semibold leading-6 text-app">{t('commerce.actualEconomics', 'Фактическая экономика')}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t('commerce.actualEconomicsDesc', 'Прибыль учитывает закупку, cargo, комиссии, доставку и возвраты.')}
          </p>
        </Card>
      </section>
    </Layout>
  );
}
