import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { getCommerceDashboard } from '../../lib/commerceApi';
import { formatCommerceNumber } from './commerceDashboardFormat';

export default function CommerceDashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commerce-dashboard'],
    queryFn: getCommerceDashboard,
    refetchInterval: 30_000,
  });
  const hasData = data !== undefined;

  const money = (value: string | number | undefined) => {
    if (value === undefined) return '—';
    return `${formatCommerceNumber(value, i18n.language)} ${t('commerce.currencySuffix', 'сум')}`;
  };

  const cards = [
    { label: t('commerce.revenue', 'Выручка'), value: money(data?.finance.revenue), Icon: CircleDollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('commerce.netProfit', 'Чистая прибыль'), value: money(data?.finance.netProfit), Icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
    { label: t('commerce.orders', 'Заказы'), value: data ? formatCommerceNumber(data.orders.total, i18n.language) : '—', Icon: PackageCheck, color: 'text-muted' },
    { label: t('commerce.pendingReview', 'Ожидают проверки'), value: data ? formatCommerceNumber(data.products.pendingReview, i18n.language) : '—', Icon: ClipboardCheck, color: 'text-muted' },
    { label: t('commerce.published', 'Опубликовано'), value: data ? formatCommerceNumber(data.products.published, i18n.language) : '—', Icon: ShoppingBag, color: 'text-muted' },
    { label: t('commerce.users', 'Пользователи'), value: data ? formatCommerceNumber(data.users.total, i18n.language) : '—', Icon: Users, color: 'text-muted' },
  ];

  return (
    <Layout title={t('commerce.commandCenter', 'AVERON Command Center')}>
      <Card padding="lg" className="overflow-hidden">
        <p className="text-xs font-bold tracking-[.18em] text-muted">
          {t('commerce.route', 'КИТАЙ → УЗБЕКИСТАН')}
        </p>
        <h2 className="mt-3 max-w-4xl text-2xl font-bold leading-tight tracking-tight text-app sm:text-[28px]">
          {t('commerce.heroTitle', 'Товары, доставка и реальная прибыль')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t('commerce.heroSubtitle', 'AI готовит карточки. Решение о публикации всегда принимает администратор.')}
        </p>
      </Card>

      {isError && (
        <div role="alert" className="rounded-theme border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {t('commerce.backendError', 'Backend AVERON недоступен. Проверьте соединение.')}
        </div>
      )}

      <section aria-label={t('commerce.commandCenter', 'AVERON Command Center')} aria-busy={isLoading && !hasData}>
        <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1280px]:grid-cols-3">
          {cards.map(({ label, value, Icon, color }) => (
            <Card key={label} padding="md" className="min-w-0">
              <div className="flex min-h-10 items-start justify-between gap-3">
                <p className="max-w-[calc(100%-2.5rem)] text-sm font-medium leading-5 text-muted">{label}</p>
                <Icon aria-hidden="true" focusable="false" className={`mt-0.5 shrink-0 ${color}`} size={20} />
              </div>
              <div className="mt-4 min-h-9 text-[26px] font-bold leading-9 tracking-tight tabular-nums text-app [overflow-wrap:anywhere] sm:text-[28px]">
                {isLoading && !hasData
                  ? <Skeleton className="mt-2 h-6 w-2/3" />
                  : value}
              </div>
            </Card>
          ))}
        </div>
      </section>

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
