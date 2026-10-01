import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Button, Card, Skeleton } from '../components/ui';
import { getVisualSearchAuditApi } from '../lib/visualSearchAuditApi';

const PAGE_SIZE = 25;

export default function VisualSearchAuditPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['admin', 'visual-search-audit', page],
    queryFn: () => getVisualSearchAuditApi(page, PAGE_SIZE),
  });
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <Layout title={t('visualSearchAudit.title', 'Visual Search activity')}>
      <main className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-app">
              <Search className="text-primary-500" size={24} />
              {t('visualSearchAudit.title', 'Visual Search activity')}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t('visualSearchAudit.subtitle', 'Operational history and safe indexing metadata.')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            loading={isRefetching}
            leftIcon={<RotateCcw size={14} />}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <span className="sr-only">{t('common.loading', 'Loading…')}</span>
          </div>
        ) : isError ? (
          <Card className="p-6">
            <p className="text-sm text-red-600 dark:text-red-300" role="alert">
              {t('visualSearchAudit.error', 'Could not load Visual Search activity.')}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              {t('visualSearchAudit.retry', 'Try again')}
            </Button>
          </Card>
        ) : !data?.items.length ? (
          <Card className="p-10 text-center">
            <h2 className="font-semibold text-app">
              {t('visualSearchAudit.emptyTitle', 'No Visual Search activity yet')}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {t('visualSearchAudit.emptyText', 'Completed or failed operations will appear here.')}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="bg-gray-50/60 text-muted dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3">{t('visualSearchAudit.operation', 'Operation')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.timestamp', 'Timestamp')}</th>
                    <th className="px-4 py-3">{t('common.status', 'Status')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.results', 'Results')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.duration', 'Duration')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.provider', 'Provider / model')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.productId', 'Product ID')}</th>
                    <th className="px-4 py-3">{t('visualSearchAudit.indexing', 'Indexing / failure')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-app">{item.operation}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(item.timestamp).toLocaleString(i18n.language)}
                      </td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.resultCount ?? '—'}</td>
                      <td className="px-4 py-3">{item.durationMs !== undefined ? `${item.durationMs} ms` : '—'}</td>
                      <td className="px-4 py-3">
                        {[item.provider, item.model].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono">{item.productId ?? '—'}</td>
                      <td className="px-4 py-3">
                        {[item.embeddingStatus, item.failureCode].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-app px-4 py-3">
              <p className="text-xs text-muted">
                {t('visualSearchAudit.showing', {
                  from: (page - 1) * PAGE_SIZE + 1,
                  to: Math.min(page * PAGE_SIZE, data.total),
                  total: data.total,
                  defaultValue: 'Showing {{from}}-{{to}} of {{total}}',
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t('visualSearchAudit.previous', 'Previous')}
                </Button>
                <span className="self-center text-xs text-muted" aria-live="polite">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {t('visualSearchAudit.next', 'Next')}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </Layout>
  );
}
